import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Menu from '../models/Menu.model.js';
import CookProfile from '../models/CookProfile.model.js';
import User from '../models/User.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';
import notificationService from '../services/notification.service.js';
import paymentService from '../services/payment.service.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';

const TAX_RATE = 0.05; // 5%
const DELIVERY_FEE = 30; // flat ₹30

// POST /api/orders
export const createOrder = asyncHandler(async (req, res) => {
  const { cookId, items, deliveryAddressId, cookInstructions } = req.body;

  // 1. Verify cook exists and is approved + available
  const cookProfile = await CookProfile.findById(cookId);
  if (!cookProfile) throw ApiError.notFound('Kitchen not found');
  if (cookProfile.status !== 'approved') throw ApiError.badRequest('Kitchen is not accepting orders');
  if (!cookProfile.isAvailable) throw ApiError.badRequest('Kitchen is currently unavailable');
  if (cookProfile.currentDayOrders >= cookProfile.maxDailyOrders) {
    throw ApiError.badRequest('Kitchen has reached its daily order capacity');
  }

  // 2. Verify delivery address belongs to customer
  const customer = await User.findById(req.user._id);
  const deliveryAddress = customer.addresses.id(deliveryAddressId);
  if (!deliveryAddress) throw ApiError.badRequest('Delivery address not found');

  // 3. Validate each menu item
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await Menu.find({
    _id: { $in: menuItemIds },
    cook: cookId,
    isAvailable: true,
  });

  if (menuItems.length !== menuItemIds.length) {
    throw ApiError.badRequest('One or more items are unavailable or do not belong to this kitchen');
  }

  // 4. Check quantities
  const menuMap = new Map(menuItems.map((m) => [m._id.toString(), m]));
  const orderItems = [];
  let subtotal = 0;

  for (const reqItem of items) {
    const menuItem = menuMap.get(reqItem.menuItemId);
    if (!menuItem) throw ApiError.badRequest(`Item ${reqItem.menuItemId} not found`);
    if (menuItem.quantity < reqItem.quantity) {
      throw ApiError.badRequest(`Insufficient quantity for "${menuItem.title}"`);
    }

    const price = menuItem.discountedPrice || menuItem.price;
    const itemSubtotal = price * reqItem.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      menuItem: menuItem._id,
      title: menuItem.title,
      price,
      quantity: reqItem.quantity,
      subtotal: itemSubtotal,
      image: menuItem.image,
      foodType: menuItem.foodType,
    });
  }

  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
  const totalAmount = subtotal + taxAmount + DELIVERY_FEE;

  // 5. Check for duplicate pending order (idempotency guard)
  const duplicateOrder = await Order.findOne({
    customer: req.user._id,
    cook: cookId,
    status: ORDER_STATUS.PLACED,
    createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }, // within 2 mins
  });
  if (duplicateOrder) {
    throw ApiError.conflict('A similar order was recently placed. Please wait before ordering again.');
  }

  // 6. Create order in a transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [order] = await Order.create(
      [
        {
          customer: req.user._id,
          cook: cookId,
          cookUser: cookProfile.user,
          items: orderItems,
          subtotal,
          deliveryFee: DELIVERY_FEE,
          taxAmount,
          totalAmount,
          deliveryAddress: {
            line1: deliveryAddress.line1,
            line2: deliveryAddress.line2,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
            location: deliveryAddress.location,
          },
          cookInstructions,
          statusHistory: [{ status: ORDER_STATUS.PLACED }],
        },
      ],
      { session }
    );

    // Decrease menu quantities
    for (const reqItem of items) {
      await Menu.findByIdAndUpdate(
        reqItem.menuItemId,
        { $inc: { quantity: -reqItem.quantity } },
        { session }
      );
    }

    // Increment cook's daily order count
    await CookProfile.findByIdAndUpdate(
      cookId,
      { $inc: { currentDayOrders: 1 } },
      { session }
    );

    await session.commitTransaction();

    // Notifications (non-blocking)
    notificationService.orderPlaced(req.user._id, order);
    notificationService.newOrderForCook(cookProfile.user, order);

    return ApiResponse.created(res, order, 'Order placed successfully');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

// PATCH /api/orders/:id/status — cook updates status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id).populate('cook');

  if (!order) throw ApiError.notFound('Order not found');

  // Validate the actor
  if (order.cookUser.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Not authorized to update this order');
  }

  // Validate status transition
  const validTransitions = {
    [ORDER_STATUS.PLACED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.OUT_FOR_DELIVERY],
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(
      `Cannot transition from '${order.status}' to '${status}'`
    );
  }

  order.status = status;
  order.statusHistory.push({ status, note, updatedBy: req.user._id });

  if (status === ORDER_STATUS.DELIVERED) {
    await CookProfile.findByIdAndUpdate(order.cook._id, {
      $inc: { totalOrders: 1, totalRevenue: order.totalAmount },
    });
    await Menu.updateMany(
      { _id: { $in: order.items.map((i) => i.menuItem) } },
      { $inc: { totalOrders: 1 } }
    );
  }

  await order.save();
  notificationService.orderStatusChanged(order.customer, order, status);

  return ApiResponse.success(res, order, 'Order status updated');
});

// POST /api/orders/:id/cancel — customer cancels
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.customer.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Not your order');
  }

  const cancellableStatuses = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED];
  if (!cancellableStatuses.includes(order.status)) {
    throw ApiError.badRequest(`Order cannot be cancelled at status: ${order.status}`);
  }

  // Restore quantities
  for (const item of order.items) {
    await Menu.findByIdAndUpdate(item.menuItem, {
      $inc: { quantity: item.quantity },
    });
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledBy = req.user._id;
  order.cancellationReason = req.body.reason;
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    note: req.body.reason,
    updatedBy: req.user._id,
  });

  await order.save();

  // Initiate refund if paid
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    paymentService.initiateRefund(order._id, req.body.reason).catch(() => {});
  }

  notificationService.orderStatusChanged(order.cookUser, order, ORDER_STATUS.CANCELLED);

  return ApiResponse.success(res, order, 'Order cancelled');
});

// GET /api/orders (customer) or cook's orders
export const getMyOrders = asyncHandler(async (req, res) => {
  const isCustomer = req.user.role === 'customer';
  const filter = isCustomer
    ? { customer: req.user._id }
    : { cookUser: req.user._id };

  if (req.query.status) filter.status = req.query.status;

  const options = {
    ...getPaginationOptions(req.query),
    populate: [
      { path: 'customer', select: 'name phone avatar' },
      { path: 'cook', select: 'kitchenName address' },
    ],
  };

  const { docs, meta } = await paginate(Order, filter, options);
  return ApiResponse.success(res, docs, 'Orders fetched', 200, meta);
});

// GET /api/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone avatar')
    .populate('cook', 'kitchenName address images')
    .populate('payment')
    .populate('items.menuItem', 'title image');

  if (!order) throw ApiError.notFound('Order not found');

  const isOwner =
    order.customer._id.toString() === req.user._id.toString() ||
    order.cookUser.toString() === req.user._id.toString() ||
    req.user.role === 'admin';

  if (!isOwner) throw ApiError.forbidden('Access denied');

  return ApiResponse.success(res, order);
});

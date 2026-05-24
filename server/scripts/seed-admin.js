#!/usr/bin/env node
/**
 * Seed admin user
 * Usage: node scripts/seed-admin.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homefood';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@homefood.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Import User model after DB connect
  const { default: User } = await import('../src/models/User.model.js');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save({ validateBeforeSave: false });
      console.log(`✓ Upgraded ${ADMIN_EMAIL} to admin`);
    } else {
      console.log(`✓ Admin already exists: ${ADMIN_EMAIL}`);
    }
  } else {
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`✓ Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

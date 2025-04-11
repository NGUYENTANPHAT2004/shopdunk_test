/**
 * Simple migration script to convert phone numbers in vouchers to user IDs
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MaGiamGia = require('../models/MaGiamGiaModel');
const User = require('../models/user.model');

async function migrateVouchers() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb+srv://phat1z:123@ez88.akrq2.mongodb.net/datn?retryWrites=true&w=majority&appName=ez88';
    await mongoose.connect(uri);
    
    console.log('✅ Connected to MongoDB');
    
    // Fetch all vouchers
    const vouchers = await MaGiamGia.magiamgia.find({});
    console.log(`Found ${vouchers.length} vouchers to migrate`);
    
    // Process each voucher
    for (const voucher of vouchers) {
      try {
        // Initialize new arrays
        const newIntendedUsers = [];
        const newAppliedUsers = [];
        
        // Process intended_users
        if (Array.isArray(voucher.intended_users)) {
          for (const userIdentifier of voucher.intended_users) {
            // Skip if already an ObjectId
            if (mongoose.Types.ObjectId.isValid(userIdentifier) && 
                String(userIdentifier).length === 24) {
              newIntendedUsers.push(userIdentifier);
              continue;
            }
            
            // Try to find user by phone if it's a string
            if (typeof userIdentifier === 'string') {
              const user = await User.User.findOne({ phone: userIdentifier });
              if (user) {
                newIntendedUsers.push(user._id);
              }
            }
          }
        }
        
        // Process appliedUsers
        if (Array.isArray(voucher.appliedUsers)) {
          for (const userIdentifier of voucher.appliedUsers) {
            // Skip if already an ObjectId
            if (mongoose.Types.ObjectId.isValid(userIdentifier) && 
                String(userIdentifier).length === 24) {
              newAppliedUsers.push(userIdentifier);
              continue;
            }
            
            // Try to find user by phone if it's a string
            if (typeof userIdentifier === 'string') {
              const user = await User.User.findOne({ phone: userIdentifier });
              if (user) {
                newAppliedUsers.push(user._id);
              }
            }
          }
        }
        
        // Update the voucher
        voucher.intended_users = newIntendedUsers;
        voucher.appliedUsers = newAppliedUsers;
        
        await voucher.save();
        console.log(`✅ Migrated voucher: ${voucher.magiamgia}`);
      } catch (error) {
        console.error(`❌ Error migrating voucher ${voucher.magiamgia}:`, error);
      }
    }
    
    console.log('✅ Migration completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the migration
migrateVouchers();
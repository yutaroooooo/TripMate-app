const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(20), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  line_user_id: { type: DataTypes.STRING(255), allowNull: true },
  del_flg: { type: DataTypes.TINYINT, defaultValue: 0 },
  last_active_at: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  profile_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  line_user_id: {
    type: DataTypes.STRING,
    allowNull: true
}
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
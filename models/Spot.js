const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Spot = sequelize.define('Spot', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    visit_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    start_time: {
        type: DataTypes.STRING,
        allowNull: true
    },
    end_time: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instagram_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tripId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    del_flg: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },memo: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Spot;
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    del_flg: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    memo: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    items: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Trip;
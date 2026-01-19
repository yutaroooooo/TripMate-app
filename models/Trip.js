const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
    title: {
        type: DataTypes.STRING,
        allowNull: false // タイトルは必須
    },
    start_date: {
        type: DataTypes.DATEONLY, // 日付のみ保存
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    // 旅行の削除フラグ（0:有効, 1:削除済み）
    del_flg: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

module.exports = Trip;
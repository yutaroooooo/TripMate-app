const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Settlement = sequelize.define('Settlement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tripId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // 支払った人のユーザーID
    payerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false // 「レンタカー代」「居酒屋」など
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false // 最終的な日本円金額
    },
    original_amount: {
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: true // 現地通貨での入力額（例: 12.50）
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'JPY' // 通貨コード (JPY, USD, KRW, THBなど)
    },
    exchange_rate: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true // その時の換算レート
    },
    target_ids: {
        type: DataTypes.TEXT,
        allowNull: true // NULLの場合は「全員均等」として扱う仕様
    },
    raw_text: {
        type: DataTypes.TEXT,
        allowNull: true // AI解析に使用した元の文章を保存
    },
    del_flg: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    }
}, {
    tableName: 'settlements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Settlement;
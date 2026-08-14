const GlobalCounter = require("../models/globalCounter");

const generateNumber = async (prefix, idType) => {
    const year = new Date().getFullYear();

    // ✅ Find and update counter atomically
    const counter = await GlobalCounter.findOneAndUpdate(
        { id: idType },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
    );

    // ✅ Format: INV20260001
    const sequence = String(counter.count).padStart(4, '0');
    return `${prefix}${year}${sequence}`;
};

module.exports = generateNumber;
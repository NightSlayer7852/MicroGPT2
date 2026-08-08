// controllers/settingsController.js
const Settings = require('../models/Settings');

/**
 * @desc    Get user settings
 * @route   GET /api/settings
 * @access  Private
 */
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user._id });

    // Self-healing fallback for older accounts that might not have settings yet
    if (!settings) {
      settings = await Settings.create({ userId: req.user._id });
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
};

/**
 * @desc    Update user settings
 * @route   PUT /api/settings
 * @access  Private
 */
exports.updateSettings = async (req, res) => {
  try {
    const { theme, preferredModel, clearHistoryOnLogout } = req.body;

    let settings = await Settings.findOne({ userId: req.user._id });

    if (!settings) {
      // If it doesn't exist, create it with the new values
      settings = await Settings.create({ 
        userId: req.user._id, 
        theme, 
        preferredModel, 
        clearHistoryOnLogout 
      });
    } else {
      // If it does exist, update only the fields that were provided
      if (theme !== undefined) settings.theme = theme;
      if (preferredModel !== undefined) settings.preferredModel = preferredModel;
      if (clearHistoryOnLogout !== undefined) settings.clearHistoryOnLogout = clearHistoryOnLogout;
      
      await settings.save();
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: 'Server error while updating settings' });
  }
};
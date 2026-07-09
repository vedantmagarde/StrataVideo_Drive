import User from '../models/User.js';
import Group from '../models/Group.js';

export const syncUser = async (req, res) => {
    try {
        const { email, name, picture } = req.user;

        let user = await User.findOne({ email });

        if (!user) {
            
            const group = await Group.findOne({ invitedEmails: email });

            user = new User({
                email,
                displayName: name || "",
                photoURL: picture || "",
                groupId: group ? group._id : null,
                role: group ? 'member' : 'owner'
            });
            await user.save();

            // If they were invited, add them to memberEmails and remove from invitedEmails
            if (group) {
                group.invitedEmails = group.invitedEmails.filter(e => e !== email);
                if (!group.memberEmails.includes(email)) {
                    group.memberEmails.push(email);
                }
                await group.save();
            }
        } else {
            // Update photo and name
            if (name) user.displayName = name;
            if (picture) user.photoURL = picture;
            await user.save();
        }

        // Return user and populated group
        const populatedUser = await User.findOne({ email }).populate('groupId');

        res.status(200).json({ message: "User synced successfully", user: populatedUser });
    } catch (error) {
        console.error("Error in syncUser:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMe = async (req, res) => {
    try {
        const { email } = req.user;
        const user = await User.findOne({ email }).populate('groupId');

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Error in getMe:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

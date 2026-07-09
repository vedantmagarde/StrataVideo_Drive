import User from '../models/User.js';
import Group from '../models/Group.js';

export const syncUser = async (req, res) => {
    try {
        const { userEmail, userPhoto, userName } = req;

        let user = await User.findOne({ email: userEmail });

        if (!user) {
            // Check if user is invited to any group
            const group = await Group.findOne({ invitedEmails: userEmail });

            user = new User({
                email: userEmail,
                displayName: userName || "",
                photoURL: userPhoto || "",
                groupId: group ? group._id : null,
                role: group ? 'member' : 'owner' // If they create their own group later, they are owner
            });
            await user.save();

            // If they were invited, add them to memberEmails and remove from invitedEmails
            if (group) {
                group.invitedEmails = group.invitedEmails.filter(e => e !== userEmail);
                if (!group.memberEmails.includes(userEmail)) {
                    group.memberEmails.push(userEmail);
                }
                await group.save();
            }
        } else {
            // Update photo and name just in case it changed
            if (userName) user.displayName = userName;
            if (userPhoto) user.photoURL = userPhoto;
            await user.save();
        }

        res.status(200).json({ message: "User synced successfully", user });
    } catch (error) {
        console.error("Error in syncUser:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMe = async (req, res) => {
    try {
        const { userEmail } = req;
        const user = await User.findOne({ email: userEmail }).populate('groupId');

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Error in getMe:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

import User from '../models/User.js';
import Group from '../models/Group.js';

export const syncUser = async (req, res) => {
    try {
        const { email, name, picture } = req.user;
        const { inviteCode } = req.body;

        let user = await User.findOne({ email });

        if (!user) {
            let group = null;
            
            if (inviteCode) {
                group = await Group.findOne({ inviteCode });
                if (group && group.memberEmails.length >= 10) {
                    return res.status(400).json({ error: "Maximum limit of 10 connected emails reached." });
                }
            } else {
                group = await Group.findOne({ invitedEmails: email });
            }

            if (!group) {
                group = new Group({
                    ownerEmail: email,
                    name: `${name || email.split('@')[0]}'s Vault`,
                    memberEmails: [email]
                });
                await group.save();
            }

            user = new User({
                email,
                displayName: name || "",
                photoURL: picture || "",
                groupId: group._id,
                role: group.ownerEmail === email ? 'owner' : 'member'
            });
            await user.save();

            if (group.ownerEmail !== email) {
                group.invitedEmails = group.invitedEmails.filter(e => e !== email);
                if (!group.memberEmails.includes(email)) {
                    group.memberEmails.push(email);
                }
                await group.save();
            }
        } else {
            if (name) user.displayName = name;
            if (picture) user.photoURL = picture;
            
            if (inviteCode && !user.groupId) {
                const group = await Group.findOne({ inviteCode });
                if (group) {
                    if (group.memberEmails.length >= 10) {
                        return res.status(400).json({ error: "Maximum limit of 10 connected emails reached." });
                    }
                    user.groupId = group._id;
                    user.role = 'member';
                    if (!group.memberEmails.includes(email)) {
                        group.memberEmails.push(email);
                        await group.save();
                    }
                }
            }
            await user.save();
        }

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

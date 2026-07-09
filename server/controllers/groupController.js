import Group from '../models/Group.js';
import User from '../models/User.js';

export const createGroup = async (req, res) => {
    try {
        const { userEmail } = req;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Group name is required" });
        }

        const user = await User.findOne({ email: userEmail });
        if (user.groupId) {
            return res.status(400).json({ error: "User is already in a group" });
        }

        const newGroup = new Group({
            ownerEmail: userEmail,
            name,
            memberEmails: [userEmail]
        });

        await newGroup.save();

        user.groupId = newGroup._id;
        user.role = 'owner';
        await user.save();

        res.status(201).json({ message: "Group created", group: newGroup });
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const inviteToGroup = async (req, res) => {
    try {
        const { userEmail } = req;
        const { emailToInvite } = req.body;

        const user = await User.findOne({ email: userEmail }).populate('groupId');
        if (!user.groupId || user.role !== 'owner') {
            return res.status(403).json({ error: "Only group owner can invite members" });
        }

        const group = user.groupId;
        
        if (group.memberEmails.includes(emailToInvite) || group.invitedEmails.includes(emailToInvite)) {
            return res.status(400).json({ error: "Email is already invited or a member" });
        }

        group.invitedEmails.push(emailToInvite);
        await group.save();

        res.status(200).json({ message: "User invited successfully", group });
    } catch (error) {
        console.error("Error inviting to group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { userEmail } = req;
        const { emailToRemove } = req.body;

        const user = await User.findOne({ email: userEmail }).populate('groupId');
        if (!user.groupId || user.role !== 'owner') {
            return res.status(403).json({ error: "Only group owner can remove members" });
        }

        if (userEmail === emailToRemove) {
            return res.status(400).json({ error: "Owner cannot remove themselves" });
        }

        const group = user.groupId;
        group.memberEmails = group.memberEmails.filter(e => e !== emailToRemove);
        group.invitedEmails = group.invitedEmails.filter(e => e !== emailToRemove);
        await group.save();

        // Update the removed user's record
        await User.findOneAndUpdate(
            { email: emailToRemove },
            { $unset: { groupId: "", role: "" } }
        );

        res.status(200).json({ message: "Member removed", group });
    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMembers = async (req, res) => {
    try {
        const { userEmail } = req;

        const user = await User.findOne({ email: userEmail });
        if (!user.groupId) {
            return res.status(404).json({ error: "User is not in a group" });
        }

        const members = await User.find({ groupId: user.groupId })
            .select('-youtube.accessToken -youtube.refreshToken'); // don't expose tokens

        res.status(200).json({ members });
    } catch (error) {
        console.error("Error getting members:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

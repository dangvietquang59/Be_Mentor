const Booking = require("../models/Booking");
const FreeTimeDetail = require("../models/FreetimeDetail");
const Notification = require("../models/Notification");
const Transactions = require("../models/Transactions");
const User = require("../models/User");
const AdminRevenue = require("../models/AdminRevenue");
const mongoose = require("mongoose");

// Create a new booking
async function createBooking(req, res) {
  try {
    const { participants, freetimeDetailId, amount, from, to } = req.body;
    // Kiểm tra FreeTimeDetail
    const freeTimeDetail = await FreeTimeDetail.findById(freetimeDetailId);
    if (!freeTimeDetail) {
      return res.status(404).json({ message: "FreeTimeDetail not found" });
    }

    // Kiểm tra booking đã tồn tại với thời gian chồng lắp
    const existingBooking = await Booking.find({
      freetimeDetailId,
      // Kiểm tra xem có bất kỳ booking nào có thời gian giao nhau
      $or: [
        { from: { $lt: to }, to: { $gt: from } }, // Thời gian giao nhau
      ],
    });

    if (existingBooking.length > 0) {
      return res
        .status(400)
        .json({ message: "Booking time overlaps with existing booking" });
    }

    // Chuyển đổi participants sang ObjectId
    const participantsObjectIds = participants.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Tạo booking mới
    const newBooking = new Booking({
      participants: participantsObjectIds,
      freetimeDetailId,
      amount,
      from,
      to,
    });
    await newBooking.save();

    // Thông báo cho từng participant
    const user = await User.findById(req.user.userId);
    if (user) {
      const newNotification = new Notification({
        user: participants[0],
        sender: req.user.userId,
        content: `Bạn có 1 lịch đặt mới từ ${user?.fullName}`,
        entityType: "Booking",
        entityId: newBooking._id,
      });
      await newNotification.save();
    }

    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get all bookings
async function getAllBookings(req, res) {
  try {
    const bookings = await Booking.find()
      .populate("participants")
      .populate("freetimeDetailId");
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get booking by ID
async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("participants")
      .populate("freetimeDetailId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get bookings by User ID
async function getBookingsByUserId(req, res) {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Fetch bookings and sort by 'from' field of 'freetimeDetailId'
    const bookings = await Booking.find({ participants: userIdObj })
      .populate("participants")
      .populate("freetimeDetailId")
      .sort({ createdAt: -1 }); // 1 for ascending, -1 for descending

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this user" });
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Update booking status
async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    // Cập nhật booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    const booking = await Booking.findById(id);
    // Kiểm tra nếu không tìm thấy booking
    if (!updatedBooking || !booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Tạo thông báo
    let text = "";
    let isAccepted = false;
    if (status === "Accepted") {
      text = "Lịch đặt của bạn đã được xác nhận";
      isAccepted = true;
    } else if (status === "Canceled") {
      text = "Lịch đặt của bạn đã bị từ chối";
    }
    const participants = booking?.participants;
    const member = participants?.filter(
      (people) => people?._id.toString() !== userId.toString()
    );

    if (isAccepted) {
      const mentorRevenue = booking?.amount * 0.9;
      const adminFee = booking?.amount * 0.1;
      const newTransactions = new Transactions({
        userId: member[0],
        type: "transfer",
        amount: mentorRevenue,
        status: "success",
        relatedUserId: userId,
        bookingId: booking?._id,
      });
      await newTransactions.save();

      const newRevenue = new AdminRevenue({
        transactionId: newTransactions?._id,
        amount: adminFee,
      });
      await newRevenue.save();
    }
    // Thông báo cho người dùng tham gia
    const userIdToNotify = updatedBooking.participants[1];
    const user = await User.findById(userIdToNotify);

    if (user) {
      const newNotification = new Notification({
        user: userIdToNotify,
        sender: req.user.userId,
        content: text,
        entityType: "Booking",
        entityId: updatedBooking._id,
      });
      await newNotification.save();
    }

    // Gửi phản hồi về client
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Delete booking
async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingsByUserId,
  updateBooking,
  deleteBooking,
};

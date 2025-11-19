import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  instructor: String,
  tuitionFee: Number,
  courseLevel: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Course", courseSchema);

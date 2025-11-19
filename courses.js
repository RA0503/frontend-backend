import express from "express";
const router = express.Router();
import mongoose from 'mongoose';

import csv from "csvtojson";
import Course from "../models/Course.js"; 
import { upload } from "../middleware/upload.js"; 
import redisClient from "../config/redis.js";

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file required" });

    const filePath = req.file.path;
    const jsonData = await csv().fromFile(filePath);

    const formattedData = jsonData.map(item => ({
      title: item["Course Name"] || "Untitled Course",
      courseCode: item["Course Code"] || "",
      universityCode: item["University Code"] || "",
      universityName: item["University Name"] || "",
      department: item["Department/School"] || "",
      discipline: item["Discipline/Major"] || "",
      specialization: item["Specialization"] || "",
      courseLevel: item["Course Level"] || "Unknown",
      description: item["Overview/Description"] || "",
      summary: item["Summary"] || "",
      prerequisites: item["Prerequisites (comma-separated)"]?.split(",") || [],
      learningOutcomes: item["Learning Outcomes (comma-separated)"]?.split(",") || [],
      teachingMethodology: item["Teaching Methodology"] || "",
      assessmentMethods: item["Assessment Methods (comma-separated)"]?.split(",") || [],
      credits: Number(item["Credits"]) || 0,
      durationMonths: Number(item["Duration (Months)"]) || 0,
      language: item["Language of Instruction"] || "",
      syllabusUrl: item["Syllabus URL"] || "",
      keywords: item["Keywords (comma-separated)"]?.split(",") || [],
      professorName: item["Professor Name"] || "",
      professorEmail: item["Professor Email"] || "",
      officeLocation: item["Office Location"] || "",
      intake: item["Open for Intake (Year/Semester)"] || "",
      attendanceType: item["Attendance Type"] || "",
      tuitionFee: Number(item["1st Year Tuition Fee"]) || 0,
      totalTuitionFee: Number(item["Total Tuition Fee"]) || 0,
      tuitionCurrency: item["Tuition Fee Currency"] || "USD",
      applicationFee: Number(item["Application Fee Amount"]) || 0,
      applicationFeeCurrency: item["Application Fee Currency"] || "USD",
      applicationFeeWaived: item["Application Fee Waived (Yes/No)"] === "Yes",
      requiredMaterials: item["Required Application Materials"] || "",
      gradeRequirement: item["12th Grade Requirement"] || "",
      undergraduateRequirement: item["Undergraduate Degree Requirement"] || "",
      ieltsScore: Number(item["Minimum IELTS Score"]) || 0,
      toeflScore: Number(item["Minimum TOEFL Score"]) || 0,
      pteScore: Number(item["Minimum PTE Score"]) || 0,
      duolingoScore: Number(item["Minimum Duolingo Score"]) || 0,
      cambridgeScore: Number(item["Minimum Cambridge English Score"]) || 0,
      otherEnglishTests: item["Other English Tests Accepted"] || "",
      greRequired: item["GRE Required (Yes/No)"] === "Yes",
      greScore: Number(item["GRE Score"]) || 0,
      gmatRequired: item["GMAT Required (Yes/No)"] === "Yes",
      gmatScore: Number(item["GMAT Score"]) || 0,
      satRequired: item["SAT Required (Yes/No)"] === "Yes",
      satScore: Number(item["SAT Score"]) || 0,
      actRequired: item["ACT Required (Yes/No)"] === "Yes",
      actScore: Number(item["ACT Score"]) || 0,
      waiverOptions: item["Waiver Options"] || "",
      partnerCourse: item["Partner Course (Yes/No)"] === "Yes",
      ranking: item["FT Ranking 2024"] || "",
      acceptanceRate: item["Acceptance Rate"] || "",
      domesticDeadline: item["Domestic Application Deadline"] || "",
      internationalDeadline: item["International Application Deadline"] || "",
      courseUrl: item["Course URL"] || "",
    }));

   
    const validData = formattedData.filter(course => course.title);

    if (validData.length === 0) {
      return res.status(400).json({ message: "No valid courses to insert" });
    }

    await Course.insertMany(validData);

    res.json({
      message: "CSV data stored successfully in database",
      inserted: validData.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to store CSV data", error: err.message });
  }
});







router.post("/search", async (req, res) => {
  try {
   
    const {
      searchTerm = "",
      selectedUniversity,
      courseLevel,
      tuitionMax,
      page = 1,
      limit = 20,
    } = req.body; 

    const pageNum = Number(page);
    const limitNum = Number(limit);

    
    const cacheKey = `courses:${searchTerm}:${selectedUniversity || "all"}:${courseLevel || "all"}:${tuitionMax || "all"}:${pageNum}:${limitNum}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    const filter = {};

   
    if (searchTerm.trim()) {
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        filter._id = searchTerm;
      } else {
        const regex = new RegExp(searchTerm, "i");
        filter.$or = [
          { title: regex },
          { description: regex },
          { universityName: regex },
          { universityCode: regex },
        ];
      }
    }


    if (selectedUniversity && selectedUniversity !== "all") {
      filter.universityCode = selectedUniversity;
    }

  
    if (courseLevel && courseLevel !== "all") {
      filter.courseLevel = courseLevel;
    }

  
  
     if (tuitionMax !== undefined && tuitionMax !== null) {
  filter.tuitionFee = { $lte: Number(tuitionMax) };
}

    

    const results = await Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();


    await redisClient.set(cacheKey, JSON.stringify(results), { EX: 300 });

    return res.json({ source: "db", data: results });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});





router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `course:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ source: "cache", data: JSON.parse(cached) });

    let course = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id).lean();
    }

    if (!course) return res.status(404).json({ message: "Course not found" });

    await redisClient.set(cacheKey, JSON.stringify(course), { EX: 3600 });
    return res.json({ source: "db", data: course });
  } catch (err) {
    console.error("Get course error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 04, 2025 at 07:27 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `medicationapp`
--

-- --------------------------------------------------------

--
-- Table structure for table `diseasegroup`
--

CREATE TABLE `diseasegroup` (
  `GroupID` int(11) NOT NULL,
  `GroupName` varchar(100) DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `diseasegroup`
--

INSERT INTO `diseasegroup` (`GroupID`, `GroupName`, `UserID`, `CreatedAt`) VALUES
(1, 'โรคเบาหวาน', NULL, '2025-09-20 22:49:15'),
(2, 'โรคความดัน', NULL, '2025-09-20 22:49:15'),
(3, 'โรคไขมันในเลือดสูง', NULL, '2025-09-20 22:49:15'),
(4, 'โรคไตเรื้อรัง', NULL, '2025-09-20 22:49:15'),
(5, 'โรคหอบหืด', NULL, '2025-09-20 22:49:15'),
(6, 'โรคภูมิแพ้', NULL, '2025-09-20 22:49:15'),
(7, 'โรคหลอดเลือดสมอง', NULL, '2025-09-20 22:49:15'),
(8, 'โรคหัวใจ', NULL, '2025-09-20 22:49:15'),
(9, 'โรคลมชัก', NULL, '2025-09-20 22:49:15'),
(10, 'โรคโลหิตจาง', NULL, '2025-09-20 22:49:15'),
(11, 'ทดสอบ', 1, '2025-09-20 22:58:05'),
(12, 'ทดสอบ273', 1, '2025-09-20 23:02:35'),
(17, '1', 6, '2025-09-21 01:04:31');

-- --------------------------------------------------------

--
-- Table structure for table `dosageunit`
--

CREATE TABLE `dosageunit` (
  `UnitID` int(11) NOT NULL,
  `DosageType` varchar(50) DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dosageunit`
--

INSERT INTO `dosageunit` (`UnitID`, `DosageType`, `UserID`, `CreatedAt`) VALUES
(1, 'มิลลิกรัม (mg)', NULL, '2025-09-20 22:49:15'),
(2, 'มิลลิลิตร (mL)', NULL, '2025-09-20 22:49:15'),
(3, 'ซีซี (cc)', NULL, '2025-09-20 22:49:15'),
(4, 'ทา', NULL, '2025-09-20 22:49:15'),
(5, ' ช้อนชา', NULL, '2025-09-20 22:49:15'),
(6, 'กรัม (g)', NULL, '2025-09-20 22:49:15'),
(7, 'เม็ด', NULL, '2025-09-20 22:49:15'),
(8, 'แคปซูล', NULL, '2025-09-20 22:49:15'),
(9, 'ทดสอบ112', 1, '2025-09-20 23:14:41');

-- --------------------------------------------------------

--
-- Table structure for table `duration`
--

CREATE TABLE `duration` (
  `DurationID` int(11) NOT NULL,
  `StartTime` date DEFAULT NULL,
  `EndTime` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `duration`
--

INSERT INTO `duration` (`DurationID`, `StartTime`, `EndTime`) VALUES
(1, '2025-06-01', '2025-09-01');

-- --------------------------------------------------------

--
-- Table structure for table `frequency`
--

CREATE TABLE `frequency` (
  `FrequencyID` int(11) NOT NULL,
  `FrequencyName` varchar(255) DEFAULT NULL,
  `FrequencyValue` varchar(255) DEFAULT NULL,
  `CustomValue` int(11) DEFAULT NULL,
  `WeekDays` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`WeekDays`)),
  `MonthDays` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`MonthDays`)),
  `Cycle_Use_Days` int(11) DEFAULT NULL,
  `Cycle_Rest_Days` int(11) DEFAULT NULL,
  `on_demand` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `frequency`
--

INSERT INTO `frequency` (`FrequencyID`, `FrequencyName`, `FrequencyValue`, `CustomValue`, `WeekDays`, `MonthDays`, `Cycle_Use_Days`, `Cycle_Rest_Days`, `on_demand`) VALUES
(1, 'ทุกวัน', 'every_day', NULL, NULL, NULL, NULL, NULL, 0),
(2, 'ทุก X วัน', 'every_X_days', 2, NULL, NULL, NULL, NULL, 0),
(3, 'ทุก X ชั่วโมง', 'every_X_hours', 6, NULL, NULL, NULL, NULL, 0),
(4, 'ทุกๆ X นาที', 'every_X_minutes', 30, NULL, NULL, NULL, NULL, 0),
(5, 'วันที่เจาะจงของสัปดาห์', 'weekly', NULL, NULL, NULL, NULL, NULL, 0),
(6, 'วันที่เจาะจงของเดือน', 'monthly', NULL, NULL, NULL, NULL, NULL, 0),
(7, 'X วันใช้ X วันหยุดพัก', 'cycle', NULL, NULL, NULL, 21, 7, 0),
(8, 'กินเมื่อมีอาการ', 'on_demand', NULL, NULL, NULL, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `mealschedule`
--

CREATE TABLE `mealschedule` (
  `MealID` int(11) NOT NULL,
  `MealName` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mealschedule`
--

INSERT INTO `mealschedule` (`MealID`, `MealName`) VALUES
(1, 'เช้า'),
(2, 'กลางวัน'),
(3, 'เย็น'),
(4, 'ก่อนนอน');

-- --------------------------------------------------------

--
-- Table structure for table `medication`
--

CREATE TABLE `medication` (
  `MedicationID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `Name` varchar(100) DEFAULT NULL,
  `Note` text DEFAULT NULL,
  `GroupID` int(11) DEFAULT NULL,
  `TypeID` int(11) DEFAULT NULL,
  `Dosage` int(11) DEFAULT NULL,
  `UnitID` int(11) DEFAULT NULL,
  `UsageMealID` int(11) DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `Priority` int(11) DEFAULT NULL,
  `TimeID` int(11) DEFAULT NULL,
  `FrequencyID` int(11) DEFAULT NULL,
  `FrequencyValue` varchar(50) DEFAULT NULL,
  `CustomValue` varchar(255) DEFAULT NULL,
  `WeekDays` text DEFAULT NULL,
  `MonthDays` text DEFAULT NULL,
  `Cycle_Use_Days` int(11) DEFAULT NULL,
  `Cycle_Rest_Days` int(11) DEFAULT NULL,
  `OnDemand` tinyint(1) DEFAULT 0,
  `IsActive` tinyint(1) DEFAULT 1 COMMENT '1=Active, 0=Inactive'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medication`
--

INSERT INTO `medication` (`MedicationID`, `UserID`, `Name`, `Note`, `GroupID`, `TypeID`, `Dosage`, `UnitID`, `UsageMealID`, `StartDate`, `EndDate`, `Priority`, `TimeID`, `FrequencyID`, `FrequencyValue`, `CustomValue`, `WeekDays`, `MonthDays`, `Cycle_Use_Days`, `Cycle_Rest_Days`, `OnDemand`, `IsActive`) VALUES
(59, 4, 'ยาความดัน', 'ยาควบคุมความดัน', 2, 1, 1, 7, 3, '2025-08-18', '2025-08-25', 2, 3, 1, NULL, NULL, NULL, NULL, NULL, NULL, 0, 1),
(61, 5, 'para', NULL, 2, 1, 1, 7, 2, '2025-08-20', '2025-08-30', 1, 3, 5, NULL, NULL, NULL, NULL, NULL, NULL, 0, 1),
(83, 1, 'Test2', NULL, 5, 3, 1, 3, 1, '2025-09-16', '2025-09-25', 1, NULL, 5, 'weekly', NULL, '[4,2,6]', NULL, NULL, NULL, 0, 0),
(84, 1, 'Del', NULL, 2, 1, 3, 7, 1, '2025-09-18', '2025-09-24', 1, NULL, 2, 'every_X_days', '2', NULL, NULL, NULL, NULL, 0, 1),
(90, 6, '1', NULL, 1, 7, 1, 7, 1, '2025-09-21', '2025-09-30', 2, NULL, 1, 'every_day', NULL, NULL, NULL, NULL, NULL, 0, 1),
(91, 6, '2', NULL, 8, 4, 1, 3, 1, '2025-09-21', '2025-09-27', 1, NULL, 2, 'every_X_days', '2', NULL, NULL, NULL, NULL, 0, 1),
(92, 6, '3', NULL, 10, 1, 1, 1, 1, '2025-09-21', '2025-09-25', 1, NULL, 3, 'every_X_hours', '12', NULL, NULL, NULL, NULL, 0, 1),
(93, 1, 'Oaosooso', 'Es', 6, 1, 1, 1, 2, '2025-09-21', '2025-09-30', 2, 3, 6, 'monthly', NULL, NULL, '[21,22,23,24,25,26,30]', NULL, NULL, 0, 1),
(94, 1, 'ทดสอบ', NULL, 2, 2, 100, 6, 2, '2025-10-02', '2025-10-07', 1, 2, 1, 'every_day', NULL, NULL, NULL, NULL, NULL, 0, 1),
(95, 1, 'ยาอะไร', NULL, 6, 2, 44, 3, 3, '2025-10-02', '2025-10-03', 1, 2, 1, 'every_day', NULL, NULL, NULL, NULL, NULL, 0, 1),
(96, 7, 'ยาฆ่าเชื้อ', NULL, 4, 1, 1, 7, 1, '2025-10-02', '2025-10-09', 2, NULL, 1, 'every_day', NULL, NULL, NULL, NULL, NULL, 0, 1),
(97, 7, 'ยาจ้า', NULL, 4, 3, 2, 3, 1, '2025-10-02', '2025-10-02', 1, NULL, 1, 'every_day', NULL, NULL, NULL, NULL, NULL, 0, 1),
(98, 7, 'ยาใจ', NULL, 8, 1, 1, 7, 3, '2025-10-02', '2025-10-02', 1, 2, 1, 'every_day', NULL, NULL, NULL, NULL, NULL, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `medicationhistory`
--

CREATE TABLE `medicationhistory` (
  `HistoryID` int(11) NOT NULL,
  `MedicationID` int(11) DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL,
  `old_dosage` int(11) DEFAULT NULL,
  `new_dosage` int(11) DEFAULT NULL,
  `old_defaultMealTime` time DEFAULT NULL,
  `new_defaultMealTime` time DEFAULT NULL,
  `old_meal_time` time DEFAULT NULL,
  `new_meal_time` time DEFAULT NULL,
  `old_start_date` date DEFAULT NULL,
  `new_start_date` date DEFAULT NULL,
  `old_end_date` date DEFAULT NULL,
  `new_end_date` date DEFAULT NULL,
  `old_time_offset` time DEFAULT NULL,
  `new_time_offset` time DEFAULT NULL,
  `changed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `medicationlog`
--

CREATE TABLE `medicationlog` (
  `LogID` int(11) NOT NULL,
  `MedicationID` int(11) DEFAULT NULL,
  `ScheduleID` int(11) DEFAULT NULL,
  `Count` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่ต้องกิน',
  `PerCount` decimal(5,2) DEFAULT 0.00 COMMENT 'เปอร์เซ็นต์การกินยา (0-100)',
  `date` date NOT NULL,
  `Status` varchar(20) DEFAULT NULL,
  `SideEffects` text DEFAULT NULL,
  `TakenCount` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่กินจริง',
  `SkippedCount` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่ข้าม',
  `UpdatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `OnTimeCount` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่กินตรงเวลา',
  `LateCount` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่กินช้า',
  `UnknownCount` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่ไม่ระบุ',
  `AvgLateMinutes` decimal(10,2) DEFAULT 0.00 COMMENT 'เฉลี่ยนาทีที่กินช้า'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medicationlog`
--

INSERT INTO `medicationlog` (`LogID`, `MedicationID`, `ScheduleID`, `Count`, `PerCount`, `date`, `Status`, `SideEffects`, `TakenCount`, `SkippedCount`, `UpdatedAt`, `OnTimeCount`, `LateCount`, `UnknownCount`, `AvgLateMinutes`) VALUES
(3, 93, 3983, 1, 0.00, '2025-09-26', 'ข้าม', NULL, 0, 1, '2025-10-01 19:17:39', 0, 0, 0, 0.00),
(4, 93, 3981, 1, 100.00, '2025-09-24', 'กินแล้ว', NULL, 1, 0, '2025-10-01 19:18:19', 0, 0, 0, 0.00),
(5, 84, 1146, 1, 100.00, '2025-09-24', 'กินแล้ว', NULL, 1, 0, '2025-10-01 19:18:42', 0, 0, 0, 0.00),
(6, 95, NULL, 0, 0.00, '2025-10-01', 'รอกิน', NULL, 0, 0, '2025-10-01 19:54:35', 0, 0, 0, 0.00),
(7, 95, 11765, 1, 0.00, '2025-10-02', 'ข้าม', NULL, 0, 1, '2025-10-01 20:32:22', 0, 0, 0, 0.00),
(9, 94, 11402, 2, 0.00, '2025-10-02', 'ข้าม', NULL, 0, 2, '2025-10-02 07:14:11', 0, 0, 0, 0.00),
(12, 93, 3982, 1, 100.00, '2025-09-25', 'กินแล้ว', NULL, 1, 0, '2025-10-02 07:52:30', 0, 0, 0, 0.00),
(19, 93, 3980, 1, 100.00, '2025-09-23', 'กินแล้ว', NULL, 1, 0, '2025-10-02 08:03:34', 0, 0, 0, 0.00),
(23, 96, 13371, 2, 100.00, '2025-10-02', 'กินแล้ว', NULL, 2, 0, '2025-10-02 08:18:16', 0, 0, 0, 0.00),
(30, 97, 13403, 1, 100.00, '2025-10-02', 'กินแล้ว', NULL, 1, 0, '2025-10-02 08:25:44', 0, 0, 0, 0.00),
(50, 98, NULL, 0, 0.00, '2025-10-02', 'รอกิน', NULL, 0, 0, '2025-10-02 08:31:36', 0, 0, 0, 0.00),
(51, 94, 11406, 2, 0.00, '2025-10-03', 'ไม่ระบุ', NULL, 0, 0, '2025-10-04 17:00:00', 0, 0, 2, 0.00),
(52, 95, 11766, 1, 0.00, '2025-10-03', 'ไม่ระบุ', NULL, 0, 0, '2025-10-04 17:00:00', 0, 0, 1, 0.00),
(53, 96, 13380, 2, 0.00, '2025-10-03', 'ไม่ระบุ', NULL, 0, 0, '2025-10-04 17:00:00', 0, 0, 2, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `medicationschedule`
--

CREATE TABLE `medicationschedule` (
  `ScheduleID` int(11) NOT NULL,
  `MedicationID` int(11) DEFAULT NULL,
  `DefaultTime_ID` int(11) DEFAULT NULL,
  `Date` date DEFAULT NULL,
  `Time` time DEFAULT NULL,
  `Status` enum('รอกิน','กินแล้ว','ข้าม','ไม่ระบุ') DEFAULT 'รอกิน',
  `SideEffects` text DEFAULT NULL,
  `ActualTime` time DEFAULT NULL,
  `RecordedAt` datetime DEFAULT NULL,
  `LateMinutes` int(11) DEFAULT NULL COMMENT 'จำนวนนาทีที่กินช้า (null = กินตรงเวลา)',
  `IsLate` tinyint(1) DEFAULT 0 COMMENT '1 = กินช้า, 0 = กินตรงเวลา'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medicationschedule`
--

INSERT INTO `medicationschedule` (`ScheduleID`, `MedicationID`, `DefaultTime_ID`, `Date`, `Time`, `Status`, `SideEffects`, `ActualTime`, `RecordedAt`, `LateMinutes`, `IsLate`) VALUES
(1133, 83, 3, '2025-09-16', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(1134, 83, 3, '2025-09-18', '18:00:00', 'ไม่ระบุ', NULL, '13:47:00', NULL, NULL, 0),
(1135, 83, 3, '2025-09-20', '18:00:00', 'ไม่ระบุ', NULL, '21:21:00', '2025-09-20 21:21:05', NULL, 0),
(1136, 83, 3, '2025-09-23', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(1137, 83, 3, '2025-09-25', '18:00:00', 'ไม่ระบุ', NULL, '00:22:00', '2025-10-02 00:22:02', NULL, 0),
(1138, 83, 4, '2025-09-16', '21:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(1139, 83, 4, '2025-09-18', '21:00:00', 'ไม่ระบุ', NULL, '13:57:00', '2025-09-18 13:57:35', NULL, 0),
(1140, 83, 4, '2025-09-20', '21:00:00', 'ไม่ระบุ', NULL, '21:21:00', '2025-09-20 21:21:12', NULL, 0),
(1141, 83, 4, '2025-09-23', '21:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(1142, 83, 4, '2025-09-25', '21:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(1143, 84, 1, '2025-09-18', '08:00:00', 'ข้าม', NULL, '17:25:00', '2025-10-04 10:25:39', NULL, 0),
(1144, 84, 1, '2025-09-20', '08:00:00', 'ข้าม', NULL, '17:16:00', '2025-10-04 10:16:38', NULL, 0),
(1145, 84, 1, '2025-09-22', '08:00:00', 'ข้าม', NULL, '17:16:00', '2025-10-04 10:16:33', NULL, 0),
(1146, 84, 1, '2025-09-24', '08:00:00', 'กินแล้ว', NULL, '02:18:00', '2025-10-02 02:18:45', NULL, 0),
(3886, 90, 1, '2025-09-21', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3887, 90, 1, '2025-09-22', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3888, 90, 1, '2025-09-23', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3889, 90, 1, '2025-09-24', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3890, 90, 1, '2025-09-25', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3891, 90, 1, '2025-09-26', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3892, 90, 1, '2025-09-27', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3893, 90, 1, '2025-09-28', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3894, 90, 1, '2025-09-29', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3895, 90, 1, '2025-09-30', '08:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3896, 91, 2, '2025-09-21', '12:15:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3897, 91, 2, '2025-09-23', '12:15:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3898, 91, 2, '2025-09-25', '12:15:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3899, 91, 2, '2025-09-27', '12:15:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3908, 92, 3, '2025-09-21', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3909, 92, 3, '2025-09-22', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3910, 92, 3, '2025-09-23', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3911, 92, 3, '2025-09-24', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3912, 92, 3, '2025-09-25', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(3978, 93, 3, '2025-09-21', '18:00:00', 'กินแล้ว', NULL, '16:09:00', '2025-10-04 09:09:52', NULL, 0),
(3979, 93, 3, '2025-09-22', '18:00:00', 'ข้าม', NULL, '17:16:00', '2025-10-04 10:16:31', NULL, 0),
(3980, 93, 3, '2025-09-23', '18:00:00', 'กินแล้ว', NULL, '15:03:00', '2025-10-02 08:03:54', NULL, 0),
(3981, 93, 3, '2025-09-24', '18:00:00', 'กินแล้ว', NULL, '02:18:00', '2025-10-02 02:18:22', NULL, 0),
(3982, 93, 3, '2025-09-25', '18:00:00', 'กินแล้ว', NULL, '14:52:00', '2025-10-02 07:53:12', NULL, 0),
(3983, 93, 3, '2025-09-26', '18:00:00', 'กินแล้ว', NULL, '14:52:00', '2025-10-02 07:52:24', NULL, 0),
(3984, 93, 3, '2025-09-30', '18:00:00', 'กินแล้ว', NULL, '02:10:00', '2025-10-02 02:10:59', NULL, 0),
(11402, 94, 1, '2025-10-02', '09:00:00', 'กินแล้ว', NULL, '14:15:00', '2025-10-02 14:15:42', NULL, 0),
(11403, 94, 1, '2025-10-03', '09:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(11404, 94, 1, '2025-10-04', '09:00:00', 'กินแล้ว', 'tsaad', '20:35:00', '2025-10-04 13:23:11', 695, 1),
(11405, 94, 2, '2025-10-02', '12:30:00', 'ข้าม', NULL, NULL, '2025-10-02 14:04:20', NULL, 0),
(11406, 94, 2, '2025-10-03', '12:30:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(11407, 94, 2, '2025-10-04', '12:30:00', 'กินแล้ว', NULL, '12:52:00', '2025-10-04 12:52:03', 22, 1),
(11765, 95, 1, '2025-10-02', '08:00:00', 'กินแล้ว', NULL, '15:40:00', '2025-10-02 08:40:33', NULL, 0),
(11766, 95, 1, '2025-10-03', '08:00:00', 'ไม่ระบุ', NULL, '20:54:00', '2025-10-04 13:54:29', NULL, 0),
(13371, 96, 1, '2025-10-02', '09:00:00', 'กินแล้ว', NULL, '15:24:00', '2025-10-02 08:24:45', NULL, 0),
(13372, 96, 1, '2025-10-03', '09:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(13373, 96, 1, '2025-10-04', '09:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(13374, 96, 1, '2025-10-05', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13375, 96, 1, '2025-10-06', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13376, 96, 1, '2025-10-07', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13377, 96, 1, '2025-10-08', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13378, 96, 1, '2025-10-09', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13379, 96, 3, '2025-10-02', '18:00:00', 'กินแล้ว', NULL, '15:11:00', '2025-10-02 08:11:13', NULL, 0),
(13380, 96, 3, '2025-10-03', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(13381, 96, 3, '2025-10-04', '18:00:00', 'ไม่ระบุ', NULL, NULL, NULL, NULL, 0),
(13382, 96, 3, '2025-10-05', '18:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13383, 96, 3, '2025-10-06', '18:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13384, 96, 3, '2025-10-07', '18:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13385, 96, 3, '2025-10-08', '18:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13386, 96, 3, '2025-10-09', '18:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(13403, 97, 3, '2025-10-02', '18:00:00', 'กินแล้ว', NULL, '15:30:00', '2025-10-02 08:30:29', NULL, 0),
(13460, 98, 1, '2025-10-02', '09:00:00', 'กินแล้ว', NULL, '15:31:00', '2025-10-02 08:31:51', NULL, 0),
(13461, 98, 2, '2025-10-02', '12:30:00', 'ข้าม', NULL, '16:04:00', '2025-10-02 09:05:21', NULL, 0),
(17282, 94, 1, '2025-10-05', '09:00:00', 'กินแล้ว', NULL, NULL, '2025-10-04 13:40:39', NULL, 0),
(17283, 94, 1, '2025-10-06', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(17284, 94, 1, '2025-10-07', '09:00:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(17290, 94, 2, '2025-10-05', '12:30:00', 'ข้าม', NULL, NULL, '2025-10-04 13:20:23', NULL, 0),
(17291, 94, 2, '2025-10-06', '12:30:00', 'รอกิน', NULL, NULL, NULL, NULL, 0),
(17292, 94, 2, '2025-10-07', '12:30:00', 'รอกิน', NULL, NULL, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `medicationtype`
--

CREATE TABLE `medicationtype` (
  `TypeID` int(11) NOT NULL,
  `TypeName` varchar(100) DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medicationtype`
--

INSERT INTO `medicationtype` (`TypeID`, `TypeName`, `UserID`, `CreatedAt`) VALUES
(1, 'เม็ด', NULL, '2025-09-20 22:49:15'),
(2, 'น้ำ', NULL, '2025-09-20 22:49:15'),
(3, 'ฉีด', NULL, '2025-09-20 22:49:15'),
(4, 'ทา', NULL, '2025-09-20 22:49:15'),
(6, 'ทดสอบ', 1, '2025-09-20 23:28:48'),
(7, 'ยาคุม', 6, '2025-09-21 00:09:18');

-- --------------------------------------------------------

--
-- Table structure for table `medication_defaulttime`
--

CREATE TABLE `medication_defaulttime` (
  `id` int(11) NOT NULL,
  `medicationid` int(11) DEFAULT NULL,
  `defaulttime_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medication_defaulttime`
--

INSERT INTO `medication_defaulttime` (`id`, `medicationid`, `defaulttime_id`) VALUES
(2, 21, 1),
(3, 21, 3),
(4, 22, 1),
(5, 22, 2),
(6, 22, 4),
(7, 23, 1),
(8, 23, 4),
(9, 24, 1),
(10, 24, 3),
(11, 24, 4),
(12, 25, 1),
(13, 25, 3),
(16, 27, 1),
(17, 27, 2),
(18, 28, 1),
(19, 28, 4),
(20, 29, 3),
(21, 29, 2),
(22, 30, 1),
(23, 31, 1),
(24, 31, 2),
(25, 31, 3),
(26, 31, 4),
(31, 33, 2),
(32, 33, 4),
(33, 35, 1),
(34, 35, 2),
(35, 35, 3),
(36, 36, 2),
(37, 36, 4),
(38, 39, 3),
(39, 40, 4),
(40, 41, 2),
(43, 43, 4),
(51, 59, 1),
(52, 59, 2),
(53, 59, 3),
(56, 61, 1),
(57, 61, 3),
(86, 83, 3),
(87, 83, 4),
(88, 84, 1),
(94, 90, 1),
(95, 91, 2),
(96, 92, 3),
(97, 93, 3),
(98, 94, 1),
(99, 94, 2),
(100, 95, 1),
(101, 96, 1),
(102, 96, 3),
(103, 97, 3),
(104, 98, 1),
(105, 98, 2);

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `NotificationID` int(11) NOT NULL,
  `ScheduleID` int(11) DEFAULT NULL,
  `Time` time DEFAULT NULL,
  `Status` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `priority`
--

CREATE TABLE `priority` (
  `PriorityID` int(11) NOT NULL,
  `PriorityName` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `priority`
--

INSERT INTO `priority` (`PriorityID`, `PriorityName`) VALUES
(1, 'ปกติ'),
(2, 'สูง');

-- --------------------------------------------------------

--
-- Table structure for table `usagemeal`
--

CREATE TABLE `usagemeal` (
  `UsageMealID` int(11) NOT NULL,
  `MealName` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usagemeal`
--

INSERT INTO `usagemeal` (`UsageMealID`, `MealName`) VALUES
(1, 'พร้อมอาหาร'),
(2, 'ก่อนอาหาร'),
(3, 'หลังอาหาร');

-- --------------------------------------------------------

--
-- Table structure for table `usagemealtime`
--

CREATE TABLE `usagemealtime` (
  `TimeID` int(11) NOT NULL,
  `time` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usagemealtime`
--

INSERT INTO `usagemealtime` (`TimeID`, `time`) VALUES
(1, '00:00:00'),
(2, '00:15:00'),
(3, '00:30:00'),
(4, '00:40:00'),
(5, '00:20:00');

-- --------------------------------------------------------

--
-- Table structure for table `userdefaultmealtime`
--

CREATE TABLE `userdefaultmealtime` (
  `DefaultTime_ID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `MealID` int(11) DEFAULT NULL,
  `Time` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `userdefaultmealtime`
--

INSERT INTO `userdefaultmealtime` (`DefaultTime_ID`, `UserID`, `MealID`, `Time`) VALUES
(1, 1, 1, '08:00:00'),
(2, 1, 2, '12:15:00'),
(3, 1, 3, '18:00:00'),
(4, 1, 4, '21:00:00'),
(5, 9, 1, '08:00:00'),
(6, 9, 2, '12:00:00'),
(7, 9, 3, '18:20:00'),
(8, 9, 4, '21:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `UserID` int(11) NOT NULL,
  `Name` varchar(100) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Gender` varchar(10) DEFAULT NULL,
  `BirthDate` date DEFAULT NULL,
  `BloodType` varchar(5) DEFAULT NULL,
  `DefaultTime_ID` int(11) DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`UserID`, `Name`, `Email`, `Phone`, `Gender`, `BirthDate`, `BloodType`, `DefaultTime_ID`, `Password`, `CreatedAt`) VALUES
(1, 'Therapat Pinprom', 'Therapat@gmail.com', '0123456789', 'Male', '2004-04-09', 'A', 1, '$2b$10$lSjzPS74Pfh0RG7CBqZyuubHzaXcDfPBEghlAthfarsw5/eDS7G6a', '2025-10-04 23:18:40'),
(2, 'Aom', 'test@gmail.com', '0123456789', 'Female', '2017-07-01', 'A', 1, NULL, '2025-10-04 23:18:40'),
(3, 'Soodididiei', 'test1245@gmail.com', '0123456789', 'Male', '2025-08-12', 'AB', NULL, '$2b$10$Td6rhhbrODvRPiEgoD8tFur/Oya5cvAijrFiqBDg11UNptFB0CszO', '2025-10-04 23:18:40'),
(4, 'Test Test', 'Testt@gmail.com', '0123456789', 'Male', '2023-08-29', 'A', NULL, '$2b$10$UUaHXmE8/G55B3yTiyLGU.0kTKxOKqORxcNcIg3T6KPiUSpzOWdt2', '2025-10-04 23:18:40'),
(5, 'Therapat Pinprom', 'Therapatpinprom@gmail.com', '0123456789', 'Male', '2003-08-07', 'A', NULL, '$2b$10$By7lwd8Keq4uZ1h4Sk9vJOxPoWqYqR3b3DjdYqDWXVo6UfSxr8Mai', '2025-10-04 23:18:40'),
(6, 'ทดสอบ', '1@gmail.com', '46733464', 'Male', '2008-09-20', 'O', NULL, '$2b$10$ITof.CMOsQ0jst3jdPufTOWNyUjpuzhE6sThlFzKSVdtAN8XkVHC2', '2025-10-04 23:18:40'),
(7, 'สุชานันท์', 'suchanan.srithep@gmail.com', '0970464781', 'Female', '2003-09-19', 'A', NULL, '$2b$10$KOyFXxLJmFvGiKvy4LDlpOpgm.FRlmw8HHT62VpNZiD36vffZCreW', '2025-10-04 23:18:40'),
(9, 'guest', '2@gmail.com', '29848548', 'Male', '2001-01-04', 'AB', NULL, '$2b$10$4KHSJvTHKJdfQoi3DmLes.6Oy0dnv.iDVenblSYxmAQXQO9oiFnNS', '2025-10-04 23:22:04');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `diseasegroup`
--
ALTER TABLE `diseasegroup`
  ADD PRIMARY KEY (`GroupID`);

--
-- Indexes for table `dosageunit`
--
ALTER TABLE `dosageunit`
  ADD PRIMARY KEY (`UnitID`);

--
-- Indexes for table `duration`
--
ALTER TABLE `duration`
  ADD PRIMARY KEY (`DurationID`);

--
-- Indexes for table `frequency`
--
ALTER TABLE `frequency`
  ADD PRIMARY KEY (`FrequencyID`);

--
-- Indexes for table `mealschedule`
--
ALTER TABLE `mealschedule`
  ADD PRIMARY KEY (`MealID`);

--
-- Indexes for table `medication`
--
ALTER TABLE `medication`
  ADD PRIMARY KEY (`MedicationID`),
  ADD KEY `UserID` (`UserID`),
  ADD KEY `GroupID` (`GroupID`),
  ADD KEY `TypeID` (`TypeID`),
  ADD KEY `UnitID` (`UnitID`),
  ADD KEY `UsageMealID` (`UsageMealID`),
  ADD KEY `Priority` (`Priority`),
  ADD KEY `fk_medication_timeid` (`TimeID`),
  ADD KEY `FK_FrequencyID` (`FrequencyID`);

--
-- Indexes for table `medicationhistory`
--
ALTER TABLE `medicationhistory`
  ADD PRIMARY KEY (`HistoryID`),
  ADD KEY `MedicationID` (`MedicationID`),
  ADD KEY `UserID` (`UserID`);

--
-- Indexes for table `medicationlog`
--
ALTER TABLE `medicationlog`
  ADD PRIMARY KEY (`LogID`),
  ADD UNIQUE KEY `unique_med_date` (`MedicationID`,`date`),
  ADD KEY `ScheduleID` (`ScheduleID`),
  ADD KEY `idx_med_date` (`MedicationID`,`date`);

--
-- Indexes for table `medicationschedule`
--
ALTER TABLE `medicationschedule`
  ADD PRIMARY KEY (`ScheduleID`),
  ADD UNIQUE KEY `uniq_med_defaulttime_date` (`MedicationID`,`DefaultTime_ID`,`Date`),
  ADD UNIQUE KEY `ux_med_time_date` (`MedicationID`,`DefaultTime_ID`,`Date`),
  ADD KEY `DefaultTime_ID` (`DefaultTime_ID`),
  ADD KEY `idx_status_date` (`Status`,`Date`),
  ADD KEY `idx_late_minutes` (`LateMinutes`);

--
-- Indexes for table `medicationtype`
--
ALTER TABLE `medicationtype`
  ADD PRIMARY KEY (`TypeID`);

--
-- Indexes for table `medication_defaulttime`
--
ALTER TABLE `medication_defaulttime`
  ADD PRIMARY KEY (`id`),
  ADD KEY `defaulttime_id` (`defaulttime_id`),
  ADD KEY `fk_medication_defaulttime` (`medicationid`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`NotificationID`),
  ADD KEY `ScheduleID` (`ScheduleID`);

--
-- Indexes for table `priority`
--
ALTER TABLE `priority`
  ADD PRIMARY KEY (`PriorityID`);

--
-- Indexes for table `usagemeal`
--
ALTER TABLE `usagemeal`
  ADD PRIMARY KEY (`UsageMealID`);

--
-- Indexes for table `usagemealtime`
--
ALTER TABLE `usagemealtime`
  ADD PRIMARY KEY (`TimeID`);

--
-- Indexes for table `userdefaultmealtime`
--
ALTER TABLE `userdefaultmealtime`
  ADD PRIMARY KEY (`DefaultTime_ID`),
  ADD KEY `UserID` (`UserID`),
  ADD KEY `MealID` (`MealID`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`UserID`),
  ADD KEY `fk_users_defaulttime` (`DefaultTime_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `diseasegroup`
--
ALTER TABLE `diseasegroup`
  MODIFY `GroupID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `dosageunit`
--
ALTER TABLE `dosageunit`
  MODIFY `UnitID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `duration`
--
ALTER TABLE `duration`
  MODIFY `DurationID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `frequency`
--
ALTER TABLE `frequency`
  MODIFY `FrequencyID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `mealschedule`
--
ALTER TABLE `mealschedule`
  MODIFY `MealID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `medication`
--
ALTER TABLE `medication`
  MODIFY `MedicationID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=99;

--
-- AUTO_INCREMENT for table `medicationhistory`
--
ALTER TABLE `medicationhistory`
  MODIFY `HistoryID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `medicationlog`
--
ALTER TABLE `medicationlog`
  MODIFY `LogID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `medicationschedule`
--
ALTER TABLE `medicationschedule`
  MODIFY `ScheduleID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19986;

--
-- AUTO_INCREMENT for table `medicationtype`
--
ALTER TABLE `medicationtype`
  MODIFY `TypeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `medication_defaulttime`
--
ALTER TABLE `medication_defaulttime`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `NotificationID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `priority`
--
ALTER TABLE `priority`
  MODIFY `PriorityID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `usagemeal`
--
ALTER TABLE `usagemeal`
  MODIFY `UsageMealID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `usagemealtime`
--
ALTER TABLE `usagemealtime`
  MODIFY `TimeID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `userdefaultmealtime`
--
ALTER TABLE `userdefaultmealtime`
  MODIFY `DefaultTime_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `medication`
--
ALTER TABLE `medication`
  ADD CONSTRAINT `FK_FrequencyID` FOREIGN KEY (`FrequencyID`) REFERENCES `frequency` (`FrequencyID`),
  ADD CONSTRAINT `fk_medication_timeid` FOREIGN KEY (`TimeID`) REFERENCES `usagemealtime` (`TimeID`),
  ADD CONSTRAINT `medication_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`),
  ADD CONSTRAINT `medication_ibfk_2` FOREIGN KEY (`GroupID`) REFERENCES `diseasegroup` (`GroupID`),
  ADD CONSTRAINT `medication_ibfk_3` FOREIGN KEY (`TypeID`) REFERENCES `medicationtype` (`TypeID`),
  ADD CONSTRAINT `medication_ibfk_4` FOREIGN KEY (`UnitID`) REFERENCES `dosageunit` (`UnitID`),
  ADD CONSTRAINT `medication_ibfk_5` FOREIGN KEY (`UsageMealID`) REFERENCES `usagemeal` (`UsageMealID`),
  ADD CONSTRAINT `medication_ibfk_8` FOREIGN KEY (`Priority`) REFERENCES `priority` (`PriorityID`);

--
-- Constraints for table `medicationhistory`
--
ALTER TABLE `medicationhistory`
  ADD CONSTRAINT `medicationhistory_ibfk_1` FOREIGN KEY (`MedicationID`) REFERENCES `medication` (`MedicationID`),
  ADD CONSTRAINT `medicationhistory_ibfk_2` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`);

--
-- Constraints for table `medicationlog`
--
ALTER TABLE `medicationlog`
  ADD CONSTRAINT `medicationlog_ibfk_1` FOREIGN KEY (`MedicationID`) REFERENCES `medication` (`MedicationID`),
  ADD CONSTRAINT `medicationlog_ibfk_2` FOREIGN KEY (`ScheduleID`) REFERENCES `medicationschedule` (`ScheduleID`);

--
-- Constraints for table `medicationschedule`
--
ALTER TABLE `medicationschedule`
  ADD CONSTRAINT `medicationschedule_ibfk_1` FOREIGN KEY (`MedicationID`) REFERENCES `medication` (`MedicationID`),
  ADD CONSTRAINT `medicationschedule_ibfk_2` FOREIGN KEY (`DefaultTime_ID`) REFERENCES `userdefaultmealtime` (`DefaultTime_ID`);

--
-- Constraints for table `medication_defaulttime`
--
ALTER TABLE `medication_defaulttime`
  ADD CONSTRAINT `fk_medication_defaulttime` FOREIGN KEY (`medicationid`) REFERENCES `medication` (`MedicationID`) ON DELETE CASCADE,
  ADD CONSTRAINT `medication_defaulttime_ibfk_2` FOREIGN KEY (`defaulttime_id`) REFERENCES `userdefaultmealtime` (`DefaultTime_ID`);

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`ScheduleID`) REFERENCES `medicationschedule` (`ScheduleID`);

--
-- Constraints for table `userdefaultmealtime`
--
ALTER TABLE `userdefaultmealtime`
  ADD CONSTRAINT `userdefaultmealtime_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`),
  ADD CONSTRAINT `userdefaultmealtime_ibfk_2` FOREIGN KEY (`MealID`) REFERENCES `mealschedule` (`MealID`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_defaulttime` FOREIGN KEY (`DefaultTime_ID`) REFERENCES `userdefaultmealtime` (`DefaultTime_ID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
const JWT_SECRET = 'your_jwt_secret_key_here';
const plainPassword = 'mypassword123';
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log('Hashed password:', hash);
});

app.use(cors());
app.use(bodyParser.json());

// เชื่อมต่อ MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // เปลี่ยนตาม XAMPP ของคุณ
  database: 'medicationapp',
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected!');
});

// POST /api/register
app.post('/api/register', async (req, res) => {
  const {
    name,
    email,
    phone,
    gender,
    birthDate,
    bloodType,
    password
  } = req.body;

  // ตรวจสอบข้อมูล
  if (!name || !email || !phone || !gender || !birthDate || !bloodType || !password) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // บันทึกข้อมูลผู้ใช้ใน database
    const sql = `
      INSERT INTO users (Name, Email, Phone, Gender, BirthDate, BloodType, Password, CreatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
      sql,
      [name, email, phone, gender, birthDate, bloodType, hashedPassword],
      (err, result) => {
        if (err) {
          console.error('Database error:', err);

          // ตรวจสอบ duplicate email
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
          }

          return res.status(500).json({ error: 'ไม่สามารถสมัครสมาชิกได้' });
        }

        const newUserId = result.insertId;
        console.log(' User registered successfully:', newUserId);

        // สร้าง Default Meal Times สำหรับ user ใหม่
        const defaultMealTimes = [
          { MealID: 1, Time: '08:00:00', MealName: 'เช้า' },      // เช้า
          { MealID: 2, Time: '12:00:00', MealName: 'เที่ยง' },   // เที่ยง
          { MealID: 3, Time: '18:00:00', MealName: 'เย็น' },     // เย็น
          { MealID: 4, Time: '21:00:00', MealName: 'ก่อนนอน' }  // ก่อนนอน
        ];

        const mealTimePromises = defaultMealTimes.map(({ MealID, Time }) => {
          return new Promise((resolve, reject) => {
            const insertMealTimeSql = `
              INSERT INTO userdefaultmealtime (UserID, MealID, Time) 
              VALUES (?, ?, ?)
            `;

            db.query(insertMealTimeSql, [newUserId, MealID, Time], (err, result) => {
              if (err) {
                console.error(`❌ Failed to create meal time for MealID ${MealID}:`, err);
                reject(err);
              } else {
                console.log(` Created default meal time: MealID ${MealID} at ${Time}`);
                resolve(result);
              }
            });
          });
        });

        // รอให้สร้าง meal times ทั้งหมดเสร็จ
        Promise.all(mealTimePromises)
          .then(() => {
            console.log(' All default meal times created successfully for user:', newUserId);

            res.status(201).json({
              success: true,
              message: 'สมัครสมาชิกสำเร็จ',
              userId: newUserId,
              user: {
                id: newUserId,
                name,
                email,
                phone,
                gender,
                birthDate,
                bloodType
              }
            });
          })
          .catch(mealTimeErr => {
            console.error('Error creating default meal times:', mealTimeErr);

            // ถ้าสร้าง meal times ไม่สำเร็จ ให้ลบ user ที่สร้างไปแล้ว
            db.query('DELETE FROM users WHERE UserID = ?', [newUserId], (deleteErr) => {
              if (deleteErr) {
                console.error('Failed to rollback user creation:', deleteErr);
              }
            });

            res.status(500).json({
              error: 'สมัครสมาชิกสำเร็จ แต่ไม่สามารถสร้างเวลาอาหารเริ่มต้นได้'
            });
          });
      }
    );
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  const sql = 'SELECT * FROM users WHERE Email = ?';
  db.query(sql, [Email], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) {
      return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้' });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // 3. สร้าง token
    const token = jwt.sign({ userId: user.UserID }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email
      }
    });
  });
});

app.get('/api/usagemeal', (req, res) => {
  db.query('SELECT * FROM usagemeal', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results.map(row => ({
      ...row
    })));
  });
});

app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results.map(row => ({
      ...row
    })));
  });
});


// /api/user/:id  ลบบัญชีผู้ใช้
app.delete('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const { password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ 
      error: 'User ID and password are required' 
    });
  }

  try {
    // ตรวจสอบรหัสผ่าน
    db.query(
      'SELECT Password FROM users WHERE UserID = ?',
      [userId],
      async (err, userResult) => {
        if (err) {
          console.error('Error fetching user:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        if (userResult.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult[0];
        const isPasswordValid = await bcrypt.compare(password, user.Password);

        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        console.log(`Starting account deletion for UserID: ${userId}`);

        // ลบตามลำดับ
        const deleteStep1 = () => {
          db.query(
            `DELETE FROM medicationschedule 
             WHERE MedicationID IN (SELECT MedicationID FROM medication WHERE UserID = ?)`,
            [userId],
            (err) => {
              if (err) {
                console.error('Error deleting schedules:', err);
                return res.status(500).json({ error: 'Failed to delete schedules' });
              }
              console.log(` Deleted medication schedules`);
              deleteStep2();
            }
          );
        };

        const deleteStep2 = () => {
          db.query(
            `DELETE FROM medication_defaulttime 
             WHERE medicationid IN (SELECT MedicationID FROM medication WHERE UserID = ?)`,
            [userId],
            (err) => {
              if (err) {
                console.error('Error deleting default times:', err);
                return res.status(500).json({ error: 'Failed to delete default times' });
              }
              console.log(`Deleted medication default times`);
              deleteStep3();
            }
          );
        };

        const deleteStep3 = () => {
          db.query(
            `DELETE FROM medicationlog 
             WHERE MedicationID IN (SELECT MedicationID FROM medication WHERE UserID = ?)`,
            [userId],
            (err) => {
              if (err) {
                console.error('Error deleting logs:', err);
                return res.status(500).json({ error: 'Failed to delete logs' });
              }
              console.log(`Deleted medication logs`);
              deleteStep4();
            }
          );
        };

        const deleteStep4 = () => {
          db.query(
            'DELETE FROM medication WHERE UserID = ?',
            [userId],
            (err) => {
              if (err) {
                console.error('Error deleting medications:', err);
                return res.status(500).json({ error: 'Failed to delete medications' });
              }
              console.log(`Deleted medications`);
              deleteStep5();
            }
          );
        };

        const deleteStep5 = () => {
          db.query(
            'DELETE FROM userdefaultmealtime WHERE UserID = ?',
            [userId],
            (err) => {
              if (err) {
                console.error('Error deleting meal times:', err);
                return res.status(500).json({ error: 'Failed to delete meal times' });
              }
              console.log(`Deleted user meal times`);
              deleteStep6();
            }
          );
        };

        const deleteStep6 = () => {
          db.query(
            'DELETE FROM users WHERE UserID = ?',
            [userId],
            (err) => {
              if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({ error: 'Failed to delete user' });
              }
              console.log(`Deleted user account`);
              
              res.json({
                success: true,
                message: 'Account deleted successfully'
              });
            }
          );
        };

        // เริ่มลบตั้งแต่ step 1
        deleteStep1();
      }
    );

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error.message
    });
  }
});


// /api/medications
app.post('/api/medications', (req, res) => {
  const data = req.body;
  console.log('/api/medications payload:', data);

  let {
    UserID, Name, Note, GroupID, TypeID, Dosage,
    UnitID, UsageMealID, PrePostTime, Priority,
    StartDate, EndDate, Frequency,
    DefaultTime_ID_1, DefaultTime_ID_2, DefaultTime_ID_3, DefaultTime_ID_4,
    CustomValue, WeekDays, MonthDays, Cycle_Use_Days, Cycle_Rest_Days, OnDemand,
    StartTime // เพิ่ม StartTime
  } = data;

  const userIdNum = parseInt(UserID, 10);
  if (!userIdNum) return res.status(400).json({ error: { message: 'UserID is required' } });

  // กำหนดค่า FrequencyID
  const frequencyOptions = [
    { label: 'ทุกวัน', value: 'every_day', id: 1 },
    { label: 'ทุก X วัน', value: 'every_X_days', id: 2 },
    { label: 'ทุก X ชั่วโมง', value: 'every_X_hours', id: 3 },
    { label: 'วันที่เจาะจงของสัปดาห์', value: 'weekly', id: 5 },
    { label: 'วันที่เจาะจงของเดือน', value: 'monthly', id: 6 },
    { label: 'X วันใช้ X วันหยุดพัก', value: 'cycle', id: 7 },
    { label: 'กินเมื่อมีอาการ', value: 'on_demand', id: 8 }
  ];

  const selectedFrequency = frequencyOptions.find(option => option.value === Frequency);
  const FrequencyID = selectedFrequency ? selectedFrequency.id : null;

  if (!FrequencyID) {
    console.error('FrequencyID is not defined');
    return res.status(400).json({ error: { message: 'Frequency is invalid' } });
  }

  //Validate StartTime สำหรับ every_X_hours
  if (Frequency === 'every_X_hours') {
    if (!StartTime) {
      return res.status(400).json({ error: { message: 'StartTime is required for every_X_hours frequency' } });
    }
    if (!CustomValue || isNaN(parseInt(CustomValue, 10))) {
      return res.status(400).json({ error: { message: 'CustomValue (hours) is required for every_X_hours frequency' } });
    }
  }

  // parse numeric fields
  GroupID = GroupID ? parseInt(GroupID, 10) : null;
  TypeID = TypeID ? parseInt(TypeID, 10) : null;
  UnitID = UnitID ? parseInt(UnitID, 10) : null;
  Dosage = Dosage ? parseInt(Dosage, 10) : null;
  Priority = Priority ? parseInt(Priority, 10) : 1;
  UsageMealID = (UsageMealID === undefined || UsageMealID === null) ? null : parseInt(UsageMealID, 10);

  // สำหรับ every_X_hours ไม่ต้องใช้ DefaultTime_IDs
  const defaultTimeIds = Frequency === 'every_X_hours'
    ? []
    : [DefaultTime_ID_1, DefaultTime_ID_2, DefaultTime_ID_3, DefaultTime_ID_4]
      .map(v => (v ? parseInt(v, 10) : null))
      .filter(Boolean);

  // normalize frequency detail fields for DB
  const WeekDaysJSON = Array.isArray(WeekDays) ? JSON.stringify(WeekDays) : (typeof WeekDays === 'string' ? WeekDays : null);
  const MonthDaysJSON = Array.isArray(MonthDays) ? JSON.stringify(MonthDays) : (typeof MonthDays === 'string' ? MonthDays : null);
  const CustomValueStr = (CustomValue === undefined || CustomValue === null) ? null : String(CustomValue);
  const CycleUseDaysNum = Cycle_Use_Days ? parseInt(Cycle_Use_Days, 10) : null;
  const CycleRestDaysNum = Cycle_Rest_Days ? parseInt(Cycle_Rest_Days, 10) : null;
  const OnDemandFlag = OnDemand ? 1 : 0;

  const sendDbError = (label, err) => {
    console.error(`Error ${label}:`, err);
    return res.status(500).json({
      error: {
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        sqlMessage: err?.sqlMessage || String(err),
        where: label
      }
    });
  };

  // helper: หา/สร้าง TimeID จากจำนวนนาที
  const getOrCreateTimeID = (minutes, cb) => {
    if (minutes === null || minutes === undefined) return cb(null, null);
    const mm = String(parseInt(minutes, 10)).padStart(2, '0');
    const timeStr = `00:${mm}:00`;

    db.query('SELECT TimeID FROM usagemealtime WHERE Time = ?', [timeStr], (err, rows) => {
      if (err) return cb(err);
      if (rows.length > 0) return cb(null, rows[0].TimeID);
      db.query('INSERT INTO usagemealtime (Time) VALUES (?)', [timeStr], (err2, result2) => {
        if (err2) return cb(err2);
        cb(null, result2.insertId);
      });
    });
  };

  const proceedInsert = (timeIDFinal) => {
    // เพิ่ม StartTime ใน SQL
    const insertMain = `
      INSERT INTO medication
      (userid, name, note, groupid, typeid, dosage, unitid, usagemealid, timeid, priority, startdate, enddate, frequencyid,
       FrequencyValue, CustomValue, WeekDays, MonthDays, Cycle_Use_Days, Cycle_Rest_Days, OnDemand, StartTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userIdNum,
      Name,
      Note || null,
      GroupID,
      TypeID,
      Dosage,
      UnitID,
      UsageMealID,
      timeIDFinal,
      Priority,
      StartDate || null,
      EndDate || null,
      FrequencyID,
      Frequency || null,
      CustomValueStr,
      WeekDaysJSON,
      MonthDaysJSON,
      CycleUseDaysNum,
      CycleRestDaysNum,
      OnDemandFlag,
      StartTime || null
    ];

    console.log('Inserting medication with params:', {
      params,
      Frequency,
      StartTime,
      CustomValue: CustomValueStr
    });

    db.query(insertMain, params, (err, result) => {
      if (err) {
        console.error('INSERT medication error:', err);
        return sendDbError('INSERT medication', err);
      }

      const medId = result.insertId;

      // บันทึก log เริ่มต้นสำหรับยาใหม่
      const today = new Date().toISOString().split('T')[0];
      db.query(
        `INSERT INTO medicationlog 
         (MedicationID, ScheduleID, \`Count\`, TakenCount, SkippedCount, PerCount, date, Status, SideEffects)
         VALUES (?, NULL, 0, 0, 0, 0, ?, 'รอกิน', NULL)
         ON DUPLICATE KEY UPDATE \`Count\` = \`Count\``,
        [medId, today],
        (logErr) => {
          if (logErr) console.warn('Failed to create initial log:', logErr);
        }
      );

      db.query('SELECT * FROM medication WHERE MedicationID = ?', [medId], (selErr, rows) => {
        if (selErr) {
          console.error('SELECT inserted medication error:', selErr);
        } else {
          console.log('Inserted medication row:', rows[0]);
        }

        // สำหรับ every_X_hours ไม่ต้อง insert medication_defaulttime
        if (Frequency === 'every_X_hours' || defaultTimeIds.length === 0) {
          return res.status(201).json({
            id: medId,
            medicationId: medId,
            medication: rows ? rows[0] : null
          });
        }

        const values = defaultTimeIds.map(dt => [medId, dt]);
        db.query(
          'INSERT INTO medication_defaulttime (medicationid, defaulttime_id) VALUES ?',
          [values],
          (err2) => {
            if (err2) return sendDbError('INSERT medication_defaulttime', err2);
            res.status(201).json({
              id: medId,
              medicationId: medId,
              medication: rows ? rows[0] : null
            });
          }
        );
      });
    });
  };

  // สำหรับ every_X_hours ไม่ต้อง getOrCreateTimeID
  if (Frequency === 'every_X_hours') {
    proceedInsert(null);
  } else if ((UsageMealID === 2 || UsageMealID === 3) && PrePostTime != null) {
    const mins = parseInt(PrePostTime, 10);
    if (Number.isNaN(mins)) {
      return res.status(400).json({ error: { message: 'PrePostTime must be number of minutes' } });
    }
    getOrCreateTimeID(mins, (err, timeId) => {
      if (err) return sendDbError('getOrCreateTimeID', err);
      proceedInsert(timeId);
    });
  } else {
    proceedInsert(null);
  }
});


// Assuming you have express app and MySQL setup already
app.delete('/api/medications/:id', (req, res) => {
  const medicationId = req.params.id;

  const deleteLogQuery = 'DELETE FROM medicationlog WHERE MedicationID = ?';
  db.query(deleteLogQuery, [medicationId], (err) => {
    if (err) {
      console.error('Error deleting medication logs:', err);
      return res.status(500).json({ error: 'Failed to delete medication logs' });
    }

    console.log('Deleted medication logs for MedicationID:', medicationId);

    const deleteScheduleQuery = 'DELETE FROM medicationschedule WHERE MedicationID = ?';
    db.query(deleteScheduleQuery, [medicationId], (err2) => {
      if (err2) {
        console.error('Error deleting medication schedule:', err2);
        return res.status(500).json({ error: 'Failed to delete medication schedule' });
      }

      console.log('Deleted medication schedules for MedicationID:', medicationId);


      const deleteDefaultTimeQuery = 'DELETE FROM medication_defaulttime WHERE medicationid = ?';
      db.query(deleteDefaultTimeQuery, [medicationId], (err3) => {
        if (err3) {
          console.error('Error deleting medication default times:', err3);
          return res.status(500).json({ error: 'Failed to delete medication default times' });
        }

        console.log('Deleted medication default times for MedicationID:', medicationId);


        const deleteMedicationQuery = 'DELETE FROM medication WHERE MedicationID = ?';
        db.query(deleteMedicationQuery, [medicationId], (err4) => {
          if (err4) {
            console.error('Error deleting medication:', err4);
            return res.status(500).json({ error: 'Failed to delete medication' });
          }

          console.log('Medication deleted successfully, ID:', medicationId);
          res.status(200).json({
            success: true,
            message: 'Medication deleted successfully'
          });
        });
      });
    });
  });
});






app.get('/api/medications', (req, res) => {
  const userId = req.query.userId;

  const sql = `
    SELECT
      m.*,
      m.IsActive,
      dg.GroupName,
      mt.TypeName,
      du.DosageType,
      um.MealName AS UsageMealName,
      p.PriorityName,
      m.FrequencyValue AS FrequencyValue,
      m.CustomValue AS CustomValue,
      m.WeekDays AS WeekDays,
      m.MonthDays AS MonthDays,
      m.Cycle_Use_Days AS Cycle_Use_Days,
      m.Cycle_Rest_Days AS Cycle_Rest_Days,
      m.OnDemand AS OnDemand,
      f.FrequencyName
    FROM
      medication m
    LEFT JOIN diseasegroup dg ON m.GroupID = dg.GroupID
    LEFT JOIN medicationtype mt ON m.TypeID = mt.TypeID
    LEFT JOIN dosageunit du ON m.UnitID = du.UnitID
    LEFT JOIN usagemeal um ON m.UsageMealID = um.UsageMealID
    LEFT JOIN priority p ON m.Priority = p.PriorityID
    LEFT JOIN frequency f ON m.FrequencyID = f.FrequencyID
    WHERE m.UserID = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    // parse JSON fields stored as TEXT
    const normalized = results.map(r => {
      let weekDays = null;
      let monthDays = null;
      try {
        weekDays = r.WeekDays ? JSON.parse(r.WeekDays) : null;
      } catch (e) { weekDays = null; }
      try {
        monthDays = r.MonthDays ? JSON.parse(r.MonthDays) : null;
      } catch (e) { monthDays = null; }

      return {
        ...r,
        IsActive: r.IsActive === 1,
        WeekDays: weekDays,
        MonthDays: monthDays,
        CustomValue: r.CustomValue === null ? null : r.CustomValue,
        OnDemand: r.OnDemand === 1
      };
    });

    res.json(normalized);
  });
});


app.get('/api/medications/:id/times', (req, res) => {
  const medicationId = req.params.id;

  const sql = `
    SELECT
      udt.DefaultTime_ID,
      ms.MealName,
      udt.Time
    FROM
      medication_defaulttime mdt
    JOIN userdefaultmealtime udt ON mdt.defaulttime_id = udt.DefaultTime_ID
    JOIN mealschedule ms ON udt.MealID = ms.MealID
    WHERE
      mdt.medicationid = ?
    ORDER BY udt.Time
  `;

  db.query(sql, [medicationId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results); //[{ MealName: 'เช้า', Time: '09:00:00' }, ...]
  });
});


app.get('/api/medications/:id', (req, res) => {
  const id = req.params.id;
  console.log('MedicationID received:', id);

  const sql = `
  SELECT 
    m.*,
    dg.GroupName,
    mt.TypeName,
    du.DosageType,
    um.MealName AS UsageMealName,
    ut.time AS UsageMealTimeOffset,
    p.PriorityName,
    m.StartDate,
    m.EndDate,
    f.FrequencyName,
    -- อ่านรายละเอียดความถี่จากตาราง medication
    m.FrequencyValue AS FrequencyValue,
    m.CustomValue AS CustomValue,
    m.WeekDays AS WeekDays,
    m.MonthDays AS MonthDays,
    m.Cycle_Use_Days AS Cycle_Use_Days,
    m.Cycle_Rest_Days AS Cycle_Rest_Days,
    m.OnDemand AS OnDemand
  FROM medication m
  LEFT JOIN diseasegroup dg ON m.GroupID = dg.GroupID
  LEFT JOIN medicationtype mt ON m.TypeID = mt.TypeID
  LEFT JOIN dosageunit du ON m.UnitID = du.UnitID
  LEFT JOIN usagemeal um ON m.UsageMealID = um.UsageMealID
  LEFT JOIN usagemealtime ut ON m.TimeID = ut.TimeID
  LEFT JOIN priority p ON m.Priority = p.PriorityID
  LEFT JOIN frequency f ON m.FrequencyID = f.FrequencyID
  WHERE m.MedicationID = ?
`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error fetching medication:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const row = result[0];
    // parse stored JSON fields
    let weekDays = null, monthDays = null;
    try { weekDays = row.WeekDays ? JSON.parse(row.WeekDays) : null; } catch (e) { weekDays = null; }
    try { monthDays = row.MonthDays ? JSON.parse(row.MonthDays) : null; } catch (e) { monthDays = null; }
    row.WeekDays = weekDays;
    row.MonthDays = monthDays;
    row.OnDemand = row.OnDemand === 1;

    console.log('Medication result:', row);
    res.json(row);
  });
});

// API ดึงข้อมูล GroupID (กลุ่มโรค)
app.get('/api/groups', (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  const sql = userId
    ? 'SELECT * FROM `diseasegroup` WHERE `UserID` IS NULL OR `UserID` = ? ORDER BY `GroupName`'
    : 'SELECT * FROM `diseasegroup` ORDER BY `GroupName`';
  const params = userId ? [userId] : [];
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('get groups error', err);
      return res.status(500).json([]);
    }
    res.json(rows || []);
  });
});

// API ดึงข้อมูล UnitID (หน่วยยา)
app.get('/api/units', (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  const sql = userId
    ? 'SELECT * FROM dosageunit WHERE UserID IS NULL OR UserID = ? ORDER BY DosageType'
    : 'SELECT * FROM dosageunit ORDER BY DosageType';
  const params = userId ? [userId] : [];
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('get units error', err);
      return res.status(500).json([]);
    }
    res.json(rows || []);
  });
});

// API ดึงข้อมูล Type (ประเภทยา)
app.get('/api/types', (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  const sql = userId
    ? 'SELECT * FROM medicationtype WHERE UserID IS NULL OR UserID = ? ORDER BY TypeName'
    : 'SELECT * FROM medicationtype ORDER BY TypeName';
  const params = userId ? [userId] : [];
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('get types error', err);
      return res.status(500).json([]);
    }
    res.json(rows || []);
  });
});

app.get('/api/userdefaultmealtime/:userId', (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const query = `
    SELECT 
      udt.DefaultTime_ID,
      udt.UserID,
      udt.MealID,
      udt.Time,
      ms.MealName
    FROM userdefaultmealtime udt
    JOIN mealschedule ms ON udt.MealID = ms.MealID
    WHERE udt.UserID = ?
    ORDER BY udt.MealID
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user meal times:', err);
      return res.status(500).json({ error: 'Failed to fetch meal times' });
    }

    if (results.length === 0) {
      console.log('No meal times found for user:', userId);

      // สร้างค่าเริ่มต้นถ้ายังไม่มี
      const defaultTimes = [
        { MealID: 1, Time: '08:00:00' },
        { MealID: 2, Time: '12:00:00' },
        { MealID: 3, Time: '18:00:00' },
        { MealID: 4, Time: '21:00:00' }
      ];

      const insertPromises = defaultTimes.map(({ MealID, Time }) => {
        return new Promise((resolve, reject) => {
          db.query(
            'INSERT INTO userdefaultmealtime (UserID, MealID, Time) VALUES (?, ?, ?)',
            [userId, MealID, Time],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });
      });

      Promise.all(insertPromises)
        .then(() => {
          db.query(query, [userId], (err2, results2) => {
            if (err2) return res.status(500).json({ error: 'Failed to fetch meal times' });
            res.json(results2);
          });
        })
        .catch(err => {
          console.error('Error creating default meal times:', err);
          res.status(500).json({ error: 'Failed to create default meal times' });
        });

      return;
    }

    console.log(`Fetched ${results.length} meal times for user ${userId}`);
    res.json(results);
  });
});

// ดึงรายการก่อน/หลัง/พร้อมอาหาร
app.get('/api/meals', (req, res) => {
  db.query('SELECT DISTINCT MealName FROM usagemeal', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// ดึงช่วงเวลา เช่น 15 นาที, 30 นาที
app.get('/api/mealtimes', (req, res) => {
  db.query('SELECT * FROM usagemealtime', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

function getOrCreateUsageMealID(MealName, TimeID, callback) {
  const checkSql = 'SELECT UsageMealID FROM usagemeal WHERE MealName = ? AND TimeID = ?';
  db.query(checkSql, [MealName, TimeID], (err, results) => {
    if (err) return callback(err);

    if (results.length > 0) {
      return callback(null, results[0].UsageMealID); // ใช้ตัวที่เจอ
    } else {
      const insertSql = 'INSERT INTO usagemeal (MealName, TimeID) VALUES (?, ?)';
      db.query(insertSql, [MealName, TimeID], (err2, result2) => {
        if (err2) return callback(err2);
        return callback(null, result2.insertId); // ใช้ตัวใหม่
      });
    }
  });
}


// API ลบ duplicate medicationschedule
app.delete('/api/medicationschedule/duplicates', (req, res) => {
  const userId = req.query.userId;
  const dateParam = req.query.date;

  if (!userId || !dateParam) {
    return res.status(400).json({
      error: 'missing userId or date query param'
    });
  }

  console.log(`Searching for duplicates on ${dateParam} for user ${userId}`);

  // หาทุก record ที่ซ้ำกัน (MedicationID + Date + Time เหมือนกัน)
  const findDuplicateSql = `
    SELECT 
      MedicationID,
      Date,
      Time,
      COUNT(*) as count,
      GROUP_CONCAT(ScheduleID) as scheduleIds
    FROM medicationschedule ms
    WHERE ms.MedicationID IN (
      SELECT MedicationID FROM medication 
      WHERE UserID = ? AND IsActive = 1
    )
    AND Date = ?
    GROUP BY MedicationID, Date, Time
    HAVING COUNT(*) > 1
  `;

  db.query(findDuplicateSql, [userId, dateParam], (err, duplicates) => {
    if (err) {
      console.error('Error finding duplicates:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log(`Found ${duplicates.length} groups with duplicates`);

    if (duplicates.length === 0) {
      console.log('No duplicates found');
      return res.json({
        message: 'No duplicates found',
        deletedCount: 0
      });
    }

    let totalDeleted = 0;
    let processedGroups = 0;

    duplicates.forEach(dup => {
      const scheduleIds = dup.scheduleIds.split(',');
      // เก็บ ID แรก ลบที่เหลือ
      const idsToDelete = scheduleIds.slice(1);

      console.log(`Found ${dup.count} duplicates for MedicationID ${dup.MedicationID} at ${dup.Time}`);
      console.log(`   Keeping ScheduleID: ${scheduleIds[0]}, Deleting: ${idsToDelete.join(', ')}`);

      const deleteSql = `
        DELETE FROM medicationschedule 
        WHERE ScheduleID IN (${idsToDelete.map(() => '?').join(',')})
      `;

      db.query(deleteSql, idsToDelete, (delErr, delResult) => {
        if (delErr) {
          console.error(`Error deleting duplicates:`, delErr);
        } else {
          console.log(`Deleted ${delResult.affectedRows} duplicate records`);
          totalDeleted += delResult.affectedRows;
        }

        processedGroups++;

        // เมื่อลบเสร็จทั้งหมด ให้ส่ง response
        if (processedGroups === duplicates.length) {
          console.log(`🎉 Total deleted: ${totalDeleted} duplicate records`);
          res.json({
            message: 'Duplicates removed successfully',
            duplicateGroupsFound: duplicates.length,
            totalRecordsDeleted: totalDeleted,
            details: duplicates.map(d => ({
              medicationId: d.MedicationID,
              date: d.Date,
              time: d.Time,
              duplicateCount: d.count,
              scheduleIds: d.scheduleIds.split(',')
            }))
          });
        }
      });
    });
  });
});


app.get('/api/reminders/today', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'missing userId query param' });
  }

  const dateParam = req.query.date && typeof req.query.date === 'string'
    ? req.query.date
    : new Date().toISOString().split('T')[0];

  console.log(`📅 Fetching reminders for user ${userId} on ${dateParam}`);


  //  ฟังก์ชันคำนวณว่าควรมียาในวันนี้หรือไม่
  const shouldHaveMedicationOnDate = (dateStr, frequencyValue, startDateStr, endDateStr, customValue, weekDaysArr, monthDaysArr, cycleUse, cycleRest, onDemand) => {
    if (onDemand) return false;

    const checkDate = new Date(dateStr);
    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;

    if (startDate && checkDate < startDate) return false;
    if (endDate && checkDate > endDate) return false;

    const dayOfWeek = checkDate.getDay();
    const dayOfMonth = checkDate.getDate();

    switch (frequencyValue) {
      case 'every_day':
      case 'every_X_hours':
        return true;

      case 'every_X_days': {
        if (!startDate) return false;
        const diffTime = checkDate - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const interval = parseInt(customValue, 10);
        return diffDays % interval === 0;
      }

      case 'weekly': {
        if (!Array.isArray(weekDaysArr) || weekDaysArr.length === 0) return false;
        const normalizedWeekDays = weekDaysArr.map(d => {
          const day = parseInt(d, 10);
          return day === 7 ? 0 : day;
        });
        return normalizedWeekDays.includes(dayOfWeek);
      }

      case 'monthly': {
        if (Array.isArray(monthDaysArr) && monthDaysArr.length > 0) {
          return monthDaysArr.includes(dayOfMonth);
        }
        const dayNum = parseInt(customValue, 10);
        return dayOfMonth === dayNum;
      }

      case 'cycle': {
        if (!startDate) return false;
        const useDays = parseInt(cycleUse, 10);
        const restDays = parseInt(cycleRest, 10);
        if (isNaN(useDays) || isNaN(restDays)) return false;

        const diffTime = checkDate - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const cycleLength = useDays + restDays;
        const dayInCycle = diffDays % cycleLength;

        return dayInCycle < useDays;
      }

      default:
        return false;
    }
  };

  // สร้าง schedules ก่อนถ้าไม่มี (ตัวเดียวเท่านั้น!)
  const ensureSchedules = () => {
    return new Promise((resolve, reject) => {
      const medSql = `
      SELECT 
        m.MedicationID,
        m.Name,
        m.FrequencyValue,
        m.CustomValue,
        m.WeekDays,
        m.MonthDays,
        m.Cycle_Use_Days,
        m.Cycle_Rest_Days,
        m.OnDemand,
        m.StartDate,
        m.EndDate,
        m.StartTime,
        mdt.defaulttime_id,
        udt.Time
      FROM medication m
      LEFT JOIN medication_defaulttime mdt ON m.MedicationID = mdt.medicationid
      LEFT JOIN userdefaultmealtime udt ON mdt.defaulttime_id = udt.DefaultTime_ID
      WHERE m.UserID = ? AND m.IsActive = 1
      AND (m.StartDate IS NULL OR m.StartDate <= ?)
      AND (m.EndDate IS NULL OR m.EndDate >= ?)
    `;

      db.query(medSql, [userId, dateParam, dateParam], (err, medications) => {
        if (err) {
          console.error('Error fetching medications:', err);
          return reject(err);
        }

        console.log(`📊 Found ${medications.length} medications to check`);

        if (medications.length === 0) {
          console.log('No medications to process');
          return resolve();
        }

        let completedCount = 0;

        medications.forEach(med => {
          // ตรวจสอบแบบเข้มงวด: ต้องไม่มี schedule เดือดเดี่ยว
          const checkSql = `
          SELECT ScheduleID FROM medicationschedule 
          WHERE MedicationID = ? AND Date = ?
          LIMIT 1
        `;

          db.query(checkSql, [med.MedicationID, dateParam], (checkErr, checkResult) => {
            if (checkErr) {
              console.error('Error checking schedule:', checkErr);
              completedCount++;
              if (completedCount === medications.length) resolve();
              return;
            }

            // ถ้ามี schedule แล้ว ให้ข้ามไป
            if (checkResult && checkResult.length > 0) {
              console.log(`Schedule already exists for MedicationID ${med.MedicationID} (ScheduleID: ${checkResult[0].ScheduleID})`);
              completedCount++;
              if (completedCount === medications.length) resolve();
              return;
            }

            let weekDays = null;
            let monthDays = null;
            try { weekDays = med.WeekDays ? JSON.parse(med.WeekDays) : null; } catch (e) { weekDays = null; }
            try { monthDays = med.MonthDays ? JSON.parse(med.MonthDays) : null; } catch (e) { monthDays = null; }

            const shouldCreate = shouldHaveMedicationOnDate(
              dateParam,
              med.FrequencyValue,
              med.StartDate,
              med.EndDate,
              med.CustomValue,
              weekDays,
              monthDays,
              med.Cycle_Use_Days,
              med.Cycle_Rest_Days,
              med.OnDemand === 1
            );

            if (!shouldCreate) {
              console.log(`Skipping ${med.Name} - not scheduled for ${dateParam}`);
              completedCount++;
              if (completedCount === medications.length) resolve();
              return;
            }

            console.log(`Creating NEW schedule for ${med.Name} (${med.FrequencyValue}) on ${dateParam}`);

            // สร้าง schedule ตามประเภทความถี่
            if (med.FrequencyValue === 'every_X_hours' && med.StartTime) {
              const hours = parseInt(med.CustomValue, 10);
              const times = generateHourlyTimesForDate(med.StartTime, hours, dateParam, med.StartDate);
              let insertedCount = 0;

              if (times.length === 0) {
                console.warn(`No times generated for ${med.Name}`);
                completedCount++;
                if (completedCount === medications.length) resolve();
                return;
              }

              console.log(`Generating ${times.length} time slots for ${med.Name}`);

              times.forEach((timeStr, idx) => {
                // ตรวจสอบซ้ำก่อน INSERT เพื่อให้ชัวร์
                const doubleCheckSql = `
                SELECT ScheduleID FROM medicationschedule 
                WHERE MedicationID = ? AND Date = ? AND Time = ?
                LIMIT 1
              `;

                db.query(doubleCheckSql, [med.MedicationID, dateParam, timeStr], (doubleCheckErr, doubleCheckResult) => {
                  if (doubleCheckErr) {
                    console.error(`Error double-checking schedule:`, doubleCheckErr);
                    insertedCount++;
                    if (insertedCount === times.length) {
                      completedCount++;
                      if (completedCount === medications.length) resolve();
                    }
                    return;
                  }

                  // ถ้ามี schedule ที่เวลานั้นแล้ว ให้ข้าม
                  if (doubleCheckResult && doubleCheckResult.length > 0) {
                    console.log(`Schedule already exists: ${med.Name} at ${timeStr} (ScheduleID: ${doubleCheckResult[0].ScheduleID})`);
                    insertedCount++;
                    if (insertedCount === times.length) {
                      completedCount++;
                      if (completedCount === medications.length) resolve();
                    }
                    return;
                  }

                  // INSERT เมื่อมั่นใจว่าไม่มีอยู่
                  const insertSql = `
                  INSERT INTO medicationschedule 
                  (MedicationID, DefaultTime_ID, Date, Time, Status)
                  VALUES (?, NULL, ?, ?, 'รอกิน')
                `;

                  db.query(insertSql, [med.MedicationID, dateParam, timeStr], (insertErr, insertResult) => {
                    if (insertErr) {
                      console.error(`Error inserting schedule for ${timeStr}:`, insertErr);
                    } else {
                      console.log(`Inserted: ${med.Name} at ${timeStr} (ID: ${insertResult.insertId})`);
                    }
                    insertedCount++;

                    if (insertedCount === times.length) {
                      completedCount++;
                      if (completedCount === medications.length) resolve();
                    }
                  });
                });
              });
            } else if (med.defaulttime_id && med.Time) {
              // ตรวจสอบซ้ำสำหรับความถี่อื่น
              const doubleCheckSql = `
              SELECT ScheduleID FROM medicationschedule 
              WHERE MedicationID = ? AND Date = ? AND DefaultTime_ID = ?
              LIMIT 1
            `;

              db.query(doubleCheckSql, [med.MedicationID, dateParam, med.defaulttime_id], (doubleCheckErr, doubleCheckResult) => {
                if (doubleCheckErr) {
                  console.error(`Error double-checking schedule:`, doubleCheckErr);
                  completedCount++;
                  if (completedCount === medications.length) resolve();
                  return;
                }

                // ถ้ามีแล้ว ให้ข้าม
                if (doubleCheckResult && doubleCheckResult.length > 0) {
                  console.log(`Schedule already exists for DefaultTime_ID ${med.defaulttime_id}`);
                  completedCount++;
                  if (completedCount === medications.length) resolve();
                  return;
                }

                // INSERT
                const insertSql = `
                INSERT INTO medicationschedule 
                (MedicationID, DefaultTime_ID, Date, Time, Status)
                VALUES (?, ?, ?, ?, 'รอกิน')
              `;

                db.query(insertSql, [med.MedicationID, med.defaulttime_id, dateParam, med.Time], (insertErr, insertResult) => {
                  if (insertErr) {
                    console.error(`Error inserting schedule:`, insertErr);
                  } else {
                    console.log(`Inserted: ${med.Name} at ${med.Time} (ID: ${insertResult.insertId})`);
                  }
                  completedCount++;
                  if (completedCount === medications.length) resolve();
                });
              });
            } else {
              completedCount++;
              if (completedCount === medications.length) resolve();
            }
          });
        });
      });
    });
  };

  // รอให้สร้าง schedules เสร็จก่อน
  ensureSchedules().then(() => {
    const sqlEveryXHours = `
    SELECT
      m.MedicationID,
      m.Name AS name,
      m.IsActive,
      'ทุกๆ ' + m.CustomValue + ' ชั่วโมง' AS MealName,
      s.Time as Time,
      NULL as DefaultTime_ID,
      p.PriorityName,
      CASE WHEN p.PriorityID = 2 THEN 'สูง' ELSE 'ปกติ' END AS PriorityLabel,
      s.ScheduleID,
      s.Status,
      s.Time as ScheduleTime,
      s.ActualTime,
      s.SideEffects,
      s.LateMinutes,
      s.IsLate,
      mt.TypeName,
      m.Dosage,
      du.DosageType,
      m.FrequencyValue AS FrequencyValue,
      m.CustomValue AS CustomValue,
      m.WeekDays AS WeekDays,
      m.MonthDays AS MonthDays,
      m.Cycle_Use_Days AS Cycle_Use_Days,
      m.Cycle_Rest_Days AS Cycle_Rest_Days,
      m.OnDemand AS OnDemand,
      m.StartDate,
      m.EndDate,
      m.StartTime
    FROM medication m
    LEFT JOIN priority p ON m.Priority = p.PriorityID
    INNER JOIN medicationschedule s
      ON s.MedicationID = m.MedicationID AND s.Date = ?
    LEFT JOIN medicationtype mt ON m.TypeID = mt.TypeID
    LEFT JOIN dosageunit du ON m.UnitID = du.UnitID
    WHERE
      m.UserID = ?
      AND m.IsActive = 1
      AND m.FrequencyValue = 'every_X_hours'
      AND (m.StartDate IS NULL OR m.StartDate <= ?)
      AND (m.EndDate IS NULL OR m.EndDate >= ?)
    ORDER BY s.Time ASC
  `;

    const sqlOtherFrequency = `
  SELECT
    m.MedicationID,
    m.Name AS name,
    m.IsActive,
    CASE 
      WHEN ms.MealName IS NOT NULL AND ms.MealName != '' THEN ms.MealName
      ELSE 'ไม่ระบุ'
    END AS MealName,
    s.Time as ScheduleTime,
    s.DefaultTime_ID,
    p.PriorityName,
    CASE WHEN p.PriorityID = 2 THEN 'สูง' ELSE 'ปกติ' END AS PriorityLabel,
    s.ScheduleID,
    s.Status,
    s.ActualTime,
    s.SideEffects,
    s.LateMinutes,
    s.IsLate,
    mt.TypeName,
    m.Dosage,
    du.DosageType,
    m.FrequencyValue AS FrequencyValue,
    m.CustomValue AS CustomValue,
    m.WeekDays AS WeekDays,
    m.MonthDays AS MonthDays,
    m.Cycle_Use_Days AS Cycle_Use_Days,
    m.Cycle_Rest_Days AS Cycle_Rest_Days,
    m.OnDemand AS OnDemand,
    m.StartDate,
    m.EndDate,
    m.StartTime
  FROM medication m
  INNER JOIN medicationschedule s
    ON s.MedicationID = m.MedicationID AND s.Date = ?
  LEFT JOIN userdefaultmealtime udt
    ON s.DefaultTime_ID = udt.DefaultTime_ID
  LEFT JOIN mealschedule ms
    ON udt.MealID = ms.MealID
  LEFT JOIN priority p ON m.Priority = p.PriorityID
  LEFT JOIN medicationtype mt ON m.TypeID = mt.TypeID
  LEFT JOIN dosageunit du ON m.UnitID = du.UnitID
  WHERE
    m.UserID = ?
    AND m.IsActive = 1
    AND m.FrequencyValue != 'every_X_hours'
    AND (m.StartDate IS NULL OR m.StartDate <= ?)
    AND (m.EndDate IS NULL OR m.EndDate >= ?)
  ORDER BY s.Time ASC
`;

    let hasResponded = false;
    let allRows = [];
    let completedQueries = 0;

    const params = [dateParam, userId, dateParam, dateParam];

    // Query 1: every_X_hours
    db.query(sqlEveryXHours, params, (err1, rows1) => {
      if (err1) {
        console.error('❌ Error fetching every_X_hours:', err1);
      } else {
        console.log(`Fetched ${rows1.length} every_X_hours schedules`);
        allRows = allRows.concat(rows1 || []);
      }
      completedQueries++;

      if (completedQueries === 2) {
        finishFetch();
      }
    });

    // Query 2: other frequency
    db.query(sqlOtherFrequency, params, (err2, rows2) => {
      if (err2) {
        console.error('Error fetching other frequency:', err2);
      } else {
        console.log(`Fetched ${rows2.length} other frequency schedules`);
        allRows = allRows.concat(rows2 || []);
      }
      completedQueries++;

      if (completedQueries === 2) {
        finishFetch();
      }
    });

    // ฟังก์ชันรวม + ลบซ้ำ + sort
    const finishFetch = () => {
      if (hasResponded) return;

      console.log(`Found ${allRows.length} total schedules (before dedup)`);

      const seenSchedules = new Set();
      const filtered = (allRows || [])
        .filter(r => {
          if (!r.ScheduleID) {
            console.warn('Row without ScheduleID:', r.MedicationID);
            return false;
          }

          const key = `${r.ScheduleID}`;
          if (seenSchedules.has(key)) {
            console.warn(`Duplicate found: ScheduleID ${r.ScheduleID}, skipping...`);
            return false;
          }
          seenSchedules.add(key);
          return true;
        })
        .map(r => ({
          ScheduleID: r.ScheduleID,
          MedicationID: r.MedicationID,
          name: r.name,
          Time: r.ScheduleTime || r.Time || '00:00:00',
          rawTime: r.ScheduleTime || r.Time || '00:00:00',
          Status: r.Status || 'รอกิน',
          TypeName: r.TypeName || 'ไม่ระบุ',
          Dosage: r.Dosage,
          DosageType: r.DosageType,
          PriorityLabel: r.PriorityLabel,
          MealName: r.MealName || 'ไม่ระบุ',
          ActualTime: r.ActualTime || null,
          SideEffects: r.SideEffects || null,
          LateMinutes: r.LateMinutes || 0,
          IsLate: r.IsLate || 0
        }))
        .sort((a, b) => a.Time.localeCompare(b.Time));

      console.log(`Returning ${filtered.length} unique reminders`);

      hasResponded = true;
      res.json(filtered);
    };
  }).catch(err => {
    console.error('Error in ensureSchedules:', err);
    res.status(500).json({ error: 'Failed to create schedules' });
  });
});

// ฟังก์ชัน async สำหรับสร้าง schedules โดยไม่ส่ง response ซ้ำ
// const createSchedulesAsync = (rows, dateParam, userId) => {
//   const needSchedules = new Map();

//   rows.forEach(r => {
//     const currentDate = new Date(dateParam);
//     const startDate = r.StartDate ? new Date(r.StartDate) : null;
//     const endDate = r.EndDate ? new Date(r.EndDate) : null;

//     if (startDate && currentDate < startDate) return;
//     if (endDate && currentDate > endDate) return;

//     if (r.FrequencyValue === 'every_X_hours') {
//       const key = `${r.MedicationID}_hourly`;

//       if (!r.ScheduleID && !needSchedules.has(key)) {
//         console.log(`Found every_X_hours medication without schedule: ${r.name} (ID: ${r.MedicationID})`);

//         let weekDays = null;
//         let monthDays = null;
//         try { weekDays = r.WeekDays ? JSON.parse(r.WeekDays) : null; } catch (e) { weekDays = null; }
//         try { monthDays = r.MonthDays ? JSON.parse(r.MonthDays) : null; } catch (e) { monthDays = null; }

//         needSchedules.set(key, {
//           MedicationID: r.MedicationID,
//           Name: r.name,
//           DefaultTime_ID: null,
//           Time: null,
//           FrequencyValue: r.FrequencyValue,
//           CustomValue: r.CustomValue,
//           WeekDays: weekDays,
//           MonthDays: monthDays,
//           Cycle_Use_Days: r.Cycle_Use_Days,
//           Cycle_Rest_Days: r.Cycle_Rest_Days,
//           OnDemand: r.OnDemand === 1,
//           StartDate: r.StartDate,
//           EndDate: r.EndDate,
//           StartTime: r.StartTime
//         });
//       }
//     } else {
//       if (!r.ScheduleID && r.DefaultTime_ID) {
//         const key = `${r.MedicationID}_${r.DefaultTime_ID}`;

//         if (!needSchedules.has(key)) {
//           let weekDays = null;
//           let monthDays = null;
//           try { weekDays = r.WeekDays ? JSON.parse(r.WeekDays) : null; } catch (e) { weekDays = null; }
//           try { monthDays = r.MonthDays ? JSON.parse(r.MonthDays) : null; } catch (e) { monthDays = null; }

//           needSchedules.set(key, {
//             MedicationID: r.MedicationID,
//             Name: r.name,
//             DefaultTime_ID: r.DefaultTime_ID,
//             Time: r.Time,
//             FrequencyValue: r.FrequencyValue,
//             CustomValue: r.CustomValue,
//             WeekDays: weekDays,
//             MonthDays: monthDays,
//             Cycle_Use_Days: r.Cycle_Use_Days,
//             Cycle_Rest_Days: r.Cycle_Rest_Days,
//             OnDemand: r.OnDemand === 1,
//             StartDate: r.StartDate,
//             EndDate: r.EndDate,
//             StartTime: r.StartTime
//           });
//         }
//       }
//     }
//   });

//   const toInsert = Array.from(needSchedules.values());

//   console.log(`Need to create schedules for ${toInsert.length} medication entries`);

//   const shouldHaveMedicationOnDate = (dateStr, frequencyValue, startDateStr, endDateStr, customValue, weekDaysArr, monthDaysArr, cycleUse, cycleRest, onDemand) => {
//     if (onDemand) return false;

//     const checkDate = new Date(dateStr);
//     const startDate = startDateStr ? new Date(startDateStr) : null;
//     const endDate = endDateStr ? new Date(endDateStr) : null;

//     if (startDate && checkDate < startDate) return false;
//     if (endDate && checkDate > endDate) return false;

//     const dayOfWeek = checkDate.getDay();
//     const dayOfMonth = checkDate.getDate();

//     switch (frequencyValue) {
//       case 'every_day':
//       case 'every_X_hours':
//         return true;

//       case 'every_X_days': {
//         if (!startDate) return false;
//         const diffTime = checkDate - startDate;
//         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//         const interval = parseInt(customValue, 10);
//         return diffDays % interval === 0;
//       }

//       case 'weekly': {
//         if (!Array.isArray(weekDaysArr) || weekDaysArr.length === 0) return false;
//         const normalizedWeekDays = weekDaysArr.map(d => {
//           const day = parseInt(d, 10);
//           return day === 7 ? 0 : day;
//         });
//         return normalizedWeekDays.includes(dayOfWeek);
//       }

//       case 'monthly': {
//         if (Array.isArray(monthDaysArr) && monthDaysArr.length > 0) {
//           return monthDaysArr.includes(dayOfMonth);
//         }
//         const dayNum = parseInt(customValue, 10);
//         return dayOfMonth === dayNum;
//       }

//       case 'cycle': {
//         if (!startDate) return false;
//         const useDays = parseInt(cycleUse, 10);
//         const restDays = parseInt(cycleRest, 10);
//         if (isNaN(useDays) || isNaN(restDays)) return false;

//         const diffTime = checkDate - startDate;
//         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//         const cycleLength = useDays + restDays;
//         const dayInCycle = diffDays % cycleLength;

//         return dayInCycle < useDays;
//       }

//       default:
//         return false;
//     }
//   };


//   const insertTasks = [];
//   toInsert.forEach(entry => {
//     const shouldCreate = shouldHaveMedicationOnDate(
//       dateParam,
//       entry.FrequencyValue,
//       entry.StartDate,
//       entry.EndDate,
//       entry.CustomValue,
//       entry.WeekDays,
//       entry.MonthDays,
//       entry.Cycle_Use_Days,
//       entry.Cycle_Rest_Days,
//       entry.OnDemand
//     );

//     if (!shouldCreate) {
//       console.log(`⏭Skipping ${entry.Name} - not scheduled for ${dateParam}`);
//       return;
//     }

//     console.log(`Creating schedule for ${entry.Name} on ${dateParam}`);

//     if (entry.FrequencyValue === 'every_X_hours' && entry.StartTime) {
//       const hours = parseInt(entry.CustomValue, 10);
//       const times = generateHourlyTimesForDate(entry.StartTime, hours, dateParam, entry.StartDate);

//       console.log(`Creating ${times.length} schedules for ${entry.Name} on ${dateParam}`);

//       times.forEach(timeStr => {
//         const insertSql = `
//           INSERT IGNORE INTO medicationschedule (MedicationID, DefaultTime_ID, Date, Time, Status)
//           VALUES (?, NULL, ?, ?, 'รอกิน')
//         `;
//         const params = [entry.MedicationID, dateParam, timeStr];

//         insertTasks.push(new Promise((resolve) => {
//           db.query(insertSql, params, (err3, result3) => {
//             if (err3) {
//               console.error(`Error inserting hourly schedule for ${dateParam} ${timeStr}:`, err3);
//             } else if (result3.affectedRows > 0) {
//               console.log(`Inserted schedule: ${entry.Name} at ${dateParam} ${timeStr}`);
//             }
//             resolve();
//           });
//         }));
//       });
//     } else {
//       const insertSql = `
//         INSERT IGNORE INTO medicationschedule (MedicationID, DefaultTime_ID, Date, Time, Status)
//         VALUES (?, ?, ?, ?, 'รอกิน')
//       `;
//       const params = [entry.MedicationID, entry.DefaultTime_ID, dateParam, entry.Time];

//       insertTasks.push(new Promise((resolve) => {
//         db.query(insertSql, params, (err3, result3) => {
//           if (err3) {
//             console.error('Error inserting schedule:', err3);
//           } else if (result3.affectedRows > 0) {
//             console.log(`Inserted schedule: ${entry.Name} at ${dateParam} ${entry.Time}`);
//           }
//           resolve();
//         });
//       }));
//     }
//   });

//   Promise.all(insertTasks).then(() => {
//     console.log(`Completed ${insertTasks.length} schedule insertions`);
//   }).catch(errPromise => {
//     console.error('Error processing schedule inserts:', errPromise);
//   });
// };

const generateHourlyTimesForDate = (startTime, hours, targetDate, startDateStr) => {
  if (!startTime || !hours) {
    console.warn('Missing startTime or hours:', { startTime, hours });
    return [];
  }

  const times = [];
  const [h, m, s] = startTime.split(':').map(n => parseInt(n, 10));
  const hoursInterval = parseInt(hours, 10);

  const parseLocalDate = (dateStr) => {
    if (dateStr instanceof Date) {
      const year = dateStr.getFullYear();
      const month = String(dateStr.getMonth() + 1).padStart(2, '0');
      const day = String(dateStr.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }

    const [y, m, d] = String(dateStr).split('-').map(n => parseInt(n, 10));
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const startDate = parseLocalDate(startDateStr);
  const currentDate = parseLocalDate(targetDate);

  const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    let currentHour = h;
    const maxIterations = Math.floor(24 / hoursInterval);

    for (let i = 0; i < maxIterations; i++) {
      if (currentHour >= 24) break;

      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
      times.push(timeStr);
      currentHour += hoursInterval;
    }

    return times;
  }

  const totalHoursFromStart = daysDiff * 24;
  const cyclesPassed = Math.floor(totalHoursFromStart / hoursInterval);
  const totalHoursFromStartTime = h + (cyclesPassed * hoursInterval);
  let firstHour = totalHoursFromStartTime % 24;

  let currentHour = firstHour;
  const maxIterations = Math.floor(24 / hoursInterval);

  for (let i = 0; i < maxIterations; i++) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
    times.push(timeStr);

    currentHour = (currentHour + hoursInterval) % 24;

    if (currentHour === firstHour && times.length > 0) break;
  }

  return times;
};

// ฟังก์ชันอัปเดต medicationlog จาก medicationschedule
const updateMedicationLog = async (medicationId, date) => {
  try {
    // นับจำนวน schedule ทั้งหมดในวันนั้น
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as total FROM medicationschedule 
       WHERE MedicationID = ? AND Date = ?`,
      [medicationId, date]
    );
    const totalCount = countResult[0]?.total || 0;

    // นับตามสถานะละเอียด
    const [statusResult] = await db.promise().query(
      `SELECT 
         SUM(CASE WHEN Status = 'กินแล้ว' AND (IsLate = 0 OR LateMinutes = 0) THEN 1 ELSE 0 END) as onTime,
         SUM(CASE WHEN Status = 'กินแล้ว' AND IsLate = 1 AND LateMinutes > 0 THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN Status = 'กินแล้ว' THEN 1 ELSE 0 END) as taken,
         SUM(CASE WHEN Status = 'ข้าม' THEN 1 ELSE 0 END) as skipped,
         SUM(CASE WHEN Status = 'ไม่ระบุ' THEN 1 ELSE 0 END) as unknown,
         AVG(CASE WHEN Status = 'กินแล้ว' AND LateMinutes > 0 THEN LateMinutes ELSE NULL END) as avgLateMinutes
       FROM medicationschedule 
       WHERE MedicationID = ? AND Date = ?`,
      [medicationId, date]
    );

    const onTimeCount = parseInt(statusResult[0]?.onTime) || 0;
    const lateCount = parseInt(statusResult[0]?.late) || 0;
    const takenCount = parseInt(statusResult[0]?.taken) || 0;
    const skippedCount = parseInt(statusResult[0]?.skipped) || 0;
    const unknownCount = parseInt(statusResult[0]?.unknown) || 0;
    const avgLateMinutes = parseFloat(statusResult[0]?.avgLateMinutes || 0).toFixed(2);

    // คำนวณ %
    const perCount = totalCount > 0
      ? parseFloat(((takenCount / totalCount) * 100).toFixed(2))
      : 0;

    // ดึง ScheduleID ล่าสุดที่มีการเปลี่ยนแปลง
    const [latestSchedule] = await db.promise().query(
      `SELECT ScheduleID, Status, SideEffects FROM medicationschedule 
       WHERE MedicationID = ? AND Date = ? 
       ORDER BY RecordedAt DESC, ScheduleID DESC LIMIT 1`,
      [medicationId, date]
    );

    const scheduleId = latestSchedule[0]?.ScheduleID || null;
    const currentStatus = latestSchedule[0]?.Status || 'รอกิน';
    const sideEffects = latestSchedule[0]?.SideEffects || null;

    // บันทึก/อัปเดต log
    await db.promise().query(
      `INSERT INTO medicationlog 
       (MedicationID, ScheduleID, \`Count\`, OnTimeCount, LateCount, TakenCount, SkippedCount, UnknownCount,
        PerCount, AvgLateMinutes, date, Status, SideEffects, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         ScheduleID = VALUES(ScheduleID),
         \`Count\` = VALUES(\`Count\`),
         OnTimeCount = VALUES(OnTimeCount),
         LateCount = VALUES(LateCount),
         TakenCount = VALUES(TakenCount),
         SkippedCount = VALUES(SkippedCount),
         UnknownCount = VALUES(UnknownCount),
         PerCount = VALUES(PerCount),
         AvgLateMinutes = VALUES(AvgLateMinutes),
         Status = VALUES(Status),
         SideEffects = VALUES(SideEffects),
         UpdatedAt = NOW()`,
      [
        medicationId,
        scheduleId,
        totalCount,
        onTimeCount,
        lateCount,
        takenCount,
        skippedCount,
        unknownCount,
        perCount,
        avgLateMinutes,
        date,
        currentStatus,
        sideEffects
      ]
    );

    console.log('Updated medicationlog:', {
      medicationId,
      date,
      totalCount,
      onTimeCount,
      lateCount,
      takenCount,
      skippedCount,
      unknownCount,
      perCount,
      avgLateMinutes
    });

    return {
      success: true,
      perCount,
      totalCount,
      onTimeCount,
      lateCount,
      takenCount,
      skippedCount,
      unknownCount,
      avgLateMinutes
    };
  } catch (error) {
    console.error('Error updating medication log:', error);
    throw error;
  }
};

// PATCH /api/schedule/:id/status - อัปเดตสถานะการกินยา
app.patch('/api/schedule/:id/status', async (req, res) => {
  const scheduleId = req.params.id;
  const { status, sideEffects, actualTime, recordedAt, timingNote } = req.body;

  console.log('Update schedule status:', { scheduleId, status, actualTime });

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['รอกิน', 'กินแล้ว', 'ข้าม', 'ไม่ระบุ'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    // ดึงข้อมูล scheduled time และ MedicationID
    const [rows] = await db.promise().query(
      'SELECT MedicationID, Date, Time FROM medicationschedule WHERE ScheduleID = ?',
      [scheduleId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const { MedicationID, Date: scheduleDate, Time: scheduledTime } = rows[0];

    let lateMinutes = null;
    let isLate = 0;
    let finalTimingNote = 'ไม่ระบุ';

    // คำนวณ Late และ TimingNote เฉพาะเมื่อสถานะเป็น "กินแล้ว"
    if (status === 'กินแล้ว' && actualTime && scheduledTime) {
      const timingResult = calculateLateMinutes(scheduledTime, actualTime, DEFAULT_TOLERANCE_MINUTES);
      lateMinutes = timingResult.lateMinutes;
      isLate = timingResult.isLate;
      finalTimingNote = timingResult.timingNote;

      console.log('Timing calculation:', {
        scheduledTime,
        actualTime,
        lateMinutes,
        isLate,
        timingNote: finalTimingNote
      });
    }

    //อัปเดต schedule พร้อม LateMinutes, IsLate, TimingNote
    await db.promise().query(
      `UPDATE medicationschedule 
       SET Status = ?, 
           SideEffects = ?, 
           ActualTime = ?,
           RecordedAt = ?,
           LateMinutes = ?,
           IsLate = ?,
           TimingNote = ?
       WHERE ScheduleID = ?`,
      [status, sideEffects || null, actualTime || null, recordedAt || new Date().toISOString(),
        lateMinutes, isLate, finalTimingNote, scheduleId]
    );

    // อัปเดต medicationlog
    const logResult = await updateMedicationLog(MedicationID, scheduleDate);

    console.log('Schedule and log updated:', {
      scheduleId,
      status,
      lateMinutes,
      isLate,
      timingNote: finalTimingNote,
      logResult
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      scheduleId,
      status,
      lateMinutes,
      isLate,
      timingNote: finalTimingNote,
      log: logResult
    });
  } catch (error) {
    console.error('Update schedule status error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// ฟังก์ชัน Batch Update Log สำหรับทุกยาในวันที่กำหนด
const batchUpdateLogs = async (date) => {
  try {
    console.log(`Batch updating logs for date: ${date}`);

    // ดึงรายการยาทั้งหมดที่มี schedule ในวันนั้น
    const [medications] = await db.promise().query(
      `SELECT DISTINCT MedicationID 
       FROM medicationschedule 
       WHERE Date = ?`,
      [date]
    );

    let successCount = 0;
    let errorCount = 0;

    for (const { MedicationID } of medications) {
      try {
        await updateMedicationLog(MedicationID, date);
        successCount++;
      } catch (error) {
        console.error(`Failed to update log for MedicationID ${MedicationID}:`, error);
        errorCount++;
      }
    }

    console.log(`Batch update completed: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    console.error('Batch update error:', error);
  }
};

// เรียก batch update ทุกเที่ยงคืน (00:00)
const scheduleBatchUpdate = () => {
  const now = new Date();
  const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msUntilMidnight = tonight - now;

  setTimeout(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    batchUpdateLogs(dateStr);

    // ตั้งเวลาสำหรับวันถัดไป
    setInterval(() => {
      const today = new Date();
      today.setDate(today.getDate() - 1);
      const todayStr = today.toISOString().split('T')[0];
      batchUpdateLogs(todayStr);
    }, 24 * 60 * 60 * 1000); // ทุก 24 ชม.
  }, msUntilMidnight);

  console.log(`Scheduled batch update at midnight (in ${Math.round(msUntilMidnight / 1000 / 60)} minutes)`);
};

// เรียกตอน start server
scheduleBatchUpdate();


// PATCH /api/medications/:id - อัปเดตข้อมูลยา
app.patch('/api/medications/:id', async (req, res) => {
  const medicationId = req.params.id;
  const data = req.body;

  console.log('PATCH /api/medications/:id', { medicationId, data });

  let {
    UserID, Name, Note, GroupID, TypeID, Dosage,
    UnitID, UsageMealID, PrePostTime, Priority,
    StartDate, EndDate, Frequency,
    DefaultTime_ID_1, DefaultTime_ID_2, DefaultTime_ID_3, DefaultTime_ID_4,
    CustomValue, WeekDays, MonthDays, Cycle_Use_Days, Cycle_Rest_Days, OnDemand,
    StartTime
  } = data;

  try {
    // Validate
    const userIdNum = parseInt(UserID, 10);
    if (!userIdNum) return res.status(400).json({ error: { message: 'UserID is required' } });

    // กำหนด FrequencyID
    const frequencyOptions = [
      { label: 'ทุกวัน', value: 'every_day', id: 1 },
      { label: 'ทุก X วัน', value: 'every_X_days', id: 2 },
      { label: 'ทุก X ชั่วโมง', value: 'every_X_hours', id: 3 },
      { label: 'วันที่เจาะจงของสัปดาห์', value: 'weekly', id: 5 },
      { label: 'วันที่เจาะจงของเดือน', value: 'monthly', id: 6 },
      { label: 'X วันใช้ X วันหยุดพัก', value: 'cycle', id: 7 },
      { label: 'กินเมื่อมีอาการ', value: 'on_demand', id: 8 }
    ];

    const selectedFrequency = frequencyOptions.find(option => option.value === Frequency);
    const FrequencyID = selectedFrequency ? selectedFrequency.id : null;

    if (!FrequencyID) {
      return res.status(400).json({ error: { message: 'Frequency is invalid' } });
    }

    // Parse numeric fields
    GroupID = GroupID ? parseInt(GroupID, 10) : null;
    TypeID = TypeID ? parseInt(TypeID, 10) : null;
    UnitID = UnitID ? parseInt(UnitID, 10) : null;
    Dosage = Dosage ? parseInt(Dosage, 10) : null;
    Priority = Priority ? parseInt(Priority, 10) : 1;
    UsageMealID = (UsageMealID === undefined || UsageMealID === null) ? null : parseInt(UsageMealID, 10);

    const defaultTimeIds = Frequency === 'every_X_hours'
      ? []
      : [DefaultTime_ID_1, DefaultTime_ID_2, DefaultTime_ID_3, DefaultTime_ID_4]
        .map(v => (v ? parseInt(v, 10) : null))
        .filter(Boolean);

    const WeekDaysJSON = Array.isArray(WeekDays) ? JSON.stringify(WeekDays) : (typeof WeekDays === 'string' ? WeekDays : null);
    const MonthDaysJSON = Array.isArray(MonthDays) ? JSON.stringify(MonthDays) : (typeof MonthDays === 'string' ? MonthDays : null);
    const CustomValueStr = (CustomValue === undefined || CustomValue === null) ? null : String(CustomValue);
    const CycleUseDaysNum = Cycle_Use_Days ? parseInt(Cycle_Use_Days, 10) : null;
    const CycleRestDaysNum = Cycle_Rest_Days ? parseInt(Cycle_Rest_Days, 10) : null;
    const OnDemandFlag = OnDemand ? 1 : 0;

    // Helper: หา/สร้าง TimeID
    const getOrCreateTimeID = (minutes) => {
      return new Promise((resolve, reject) => {
        if (minutes === null || minutes === undefined) return resolve(null);
        const mm = String(parseInt(minutes, 10)).padStart(2, '0');
        const timeStr = `00:${mm}:00`;

        db.query('SELECT TimeID FROM usagemealtime WHERE Time = ?', [timeStr], (err, rows) => {
          if (err) return reject(err);
          if (rows.length > 0) return resolve(rows[0].TimeID);
          db.query('INSERT INTO usagemealtime (Time) VALUES (?)', [timeStr], (err2, result2) => {
            if (err2) return reject(err2);
            resolve(result2.insertId);
          });
        });
      });
    };

    let timeIDFinal = null;
    if (Frequency !== 'every_X_hours' && (UsageMealID === 2 || UsageMealID === 3) && PrePostTime != null) {
      const mins = parseInt(PrePostTime, 10);
      if (!Number.isNaN(mins)) {
        timeIDFinal = await getOrCreateTimeID(mins);
      }
    }

    // อัปเดตตาราง medication
    const updateSql = `
      UPDATE medication SET
        userid = ?,
        name = ?,
        note = ?,
        groupid = ?,
        typeid = ?,
        dosage = ?,
        unitid = ?,
        usagemealid = ?,
        timeid = ?,
        priority = ?,
        startdate = ?,
        enddate = ?,
        frequencyid = ?,
        FrequencyValue = ?,
        CustomValue = ?,
        WeekDays = ?,
        MonthDays = ?,
        Cycle_Use_Days = ?,
        Cycle_Rest_Days = ?,
        OnDemand = ?,
        StartTime = ?
      WHERE MedicationID = ?
    `;

    await db.promise().query(updateSql, [
      userIdNum,
      Name,
      Note || null,
      GroupID,
      TypeID,
      Dosage,
      UnitID,
      UsageMealID,
      timeIDFinal,
      Priority,
      StartDate || null,
      EndDate || null,
      FrequencyID,
      Frequency || null,
      CustomValueStr,
      WeekDaysJSON,
      MonthDaysJSON,
      CycleUseDaysNum,
      CycleRestDaysNum,
      OnDemandFlag,
      StartTime || null,
      medicationId
    ]);

    // ลบ default time เก่า
    await db.promise().query('DELETE FROM medication_defaulttime WHERE medicationid = ?', [medicationId]);

    // เพิ่ม default time ใหม่ (ถ้าไม่ใช่ every_X_hours)
    if (Frequency !== 'every_X_hours' && defaultTimeIds.length > 0) {
      const values = defaultTimeIds.map(dt => [medicationId, dt]);
      await db.promise().query(
        'INSERT INTO medication_defaulttime (medicationid, defaulttime_id) VALUES ?',
        [values]
      );
    }

    // ลบ schedule เก่าทั้งหมด (เพื่อสร้างใหม่ตามความถี่ใหม่)
    await db.promise().query('DELETE FROM medicationschedule WHERE MedicationID = ?', [medicationId]);

    console.log('Medication updated successfully:', medicationId);

    res.json({
      success: true,
      message: 'Medication updated successfully',
      medicationId
    });

  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({
      error: 'Failed to update medication',
      details: error.message
    });
  }
});

// PATCH /api/schedule/:id/status  { status: 'กินแล้ว' | 'ยังไม่กิน' }
app.patch('/api/medications/:id/toggle-active', (req, res) => {
  const medicationId = req.params.id;
  const { isActive } = req.body; // true = active, false = inactive

  console.log('Toggle active:', { medicationId, isActive });

  const sql = 'UPDATE medication SET IsActive = ? WHERE MedicationID = ?';
  db.query(sql, [isActive ? 1 : 0, medicationId], (err, result) => {
    if (err) {
      console.error('Toggle active error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    res.json({
      success: true,
      isActive: isActive,
      message: isActive ? 'เปิดการแจ้งเตือนแล้ว' : 'ปิดการแจ้งเตือนแล้ว'
    });
  });
});

// GET /api/schedule/:id - ดึงข้อมูล schedule เดียว (สำหรับ verify)
app.get('/api/schedule/:id', (req, res) => {
  const scheduleId = req.params.id;

  const sql = `
    SELECT 
      s.*,
      m.Name as MedicationName,
      m.Dosage,
      du.DosageType,
      mt.TypeName
    FROM medicationschedule s
    JOIN medication m ON s.MedicationID = m.MedicationID
    LEFT JOIN dosageunit du ON m.UnitID = du.UnitID
    LEFT JOIN medicationtype mt ON m.TypeID = mt.TypeID
    WHERE s.ScheduleID = ?
  `;

  db.query(sql, [scheduleId], (err, result) => {
    if (err) {
      console.error('Get schedule error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(result[0]);
  });
});

// DELETE /api/schedule/:id - ลบ schedule (ถ้าต้องการ)
app.delete('/api/schedule/:id', (req, res) => {
  const scheduleId = req.params.id;

  const sql = 'DELETE FROM medicationschedule WHERE ScheduleID = ?';

  db.query(sql, [scheduleId], (err, result) => {
    if (err) {
      console.error('Delete schedule error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ success: true, message: 'Schedule deleted successfully' });
  });
});

app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;

  db.query(
    'SELECT UserID, Name, Email, Phone, Gender, BirthDate, BloodType FROM users WHERE UserID = ?',
    [userId],
    (err, result) => {
      if (err) {
        console.error('Error retrieving profile:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result[0]);
    }
  );
});

app.patch('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, gender, birthdate, bloodType } = req.body;

  if (!name || !email || !phone || !gender || !birthdate || !bloodType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.query(
    'UPDATE users SET Name = ?, Email = ?, Phone = ?, Gender = ?, BirthDate = ?, BloodType = ? WHERE UserID = ?',
    [name, email, phone, gender, birthdate, bloodType, userId],
    (err, result) => {
      if (err) {
        console.error(' Error updating profile:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ ok: true });
    }
  );
});

// Get meal times
app.get('/api/meal-times/:id', (req, res) => {
  // ตรวจสอบว่า req.user.id มีค่าหรือไม่
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated or missing user ID' });
  }

  const query = 'SELECT * FROM userdefaultmealtime WHERE UserID = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);  // Log ข้อผิดพลาดจากฐานข้อมูล
      return res.status(500).json({ error: 'Failed to fetch meal times' });
    }

    // ตรวจสอบว่าได้รับข้อมูลจากฐานข้อมูลหรือไม่
    if (results.length === 0) {
      return res.status(404).json({ error: 'No meal times found for this user' });
    }

    // แปลงข้อมูลจากฐานข้อมูลให้เป็นแบบที่ frontend ต้องการ
    const mealTimes = results.reduce((acc, curr) => {
      acc[curr.MealID] = curr.Time;
      return acc;
    }, {});

    // ส่งข้อมูลกลับไปยัง frontend
    res.json(mealTimes);
  });
});

// GET /api/meal-times/:userId - ดึงเวลาอาหารของ user
app.get('/api/meal-times/:userId', (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const query = `
    SELECT 
      udt.MealID,
      ms.MealName,
      udt.Time,
      udt.DefaultTime_ID
    FROM userdefaultmealtime udt
    JOIN mealschedule ms ON udt.MealID = ms.MealID
    WHERE udt.UserID = ?
    ORDER BY udt.MealID
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch meal times' });
    }

    if (results.length === 0) {
      console.log('No meal times found for user:', userId);

      // สร้างค่าเริ่มต้นถ้าไม่มีข้อมูล
      const defaultTimes = [
        { MealID: 1, Time: '08:00:00' }, // เช้า
        { MealID: 2, Time: '12:00:00' }, // เที่ยง
        { MealID: 3, Time: '18:00:00' }, // เย็น
        { MealID: 4, Time: '21:00:00' }  // ก่อนนอน
      ];

      const insertPromises = defaultTimes.map(({ MealID, Time }) => {
        return new Promise((resolve, reject) => {
          db.query(
            'INSERT INTO userdefaultmealtime (UserID, MealID, Time) VALUES (?, ?, ?)',
            [userId, MealID, Time],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });
      });

      Promise.all(insertPromises)
        .then(() => {
          // ดึงข้อมูลใหม่หลังสร้างเสร็จ
          db.query(query, [userId], (err2, results2) => {
            if (err2) return res.status(500).json({ error: 'Failed to fetch meal times' });

            const mealTimes = results2.reduce((acc, curr) => {
              const mealKey = {
                1: 'breakfast',
                2: 'lunch',
                3: 'dinner',
                4: 'snack'
              }[curr.MealID];

              if (mealKey) {
                acc[mealKey] = curr.Time.substring(0, 5); // HH:MM
              }
              return acc;
            }, {});

            res.json(mealTimes);
          });
        })
        .catch(err => {
          console.error('Error creating default meal times:', err);
          res.status(500).json({ error: 'Failed to create default meal times' });
        });

      return;
    }

    // แปลงข้อมูลเป็น format ที่ frontend ต้องการ
    const mealTimes = results.reduce((acc, curr) => {
      const mealKey = {
        1: 'breakfast',
        2: 'lunch',
        3: 'dinner',
        4: 'snack'
      }[curr.MealID];

      if (mealKey) {
        acc[mealKey] = curr.Time.substring(0, 5); // แปลง HH:MM:SS เป็น HH:MM
      }
      return acc;
    }, {});

    console.log('Meal times fetched:', mealTimes);
    res.json(mealTimes);
  });
});

// PATCH /api/meal-times/:userId - อัปเดตเวลาอาหาร
app.patch('/api/meal-times/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { breakfast, lunch, dinner, snack } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const updates = [
    { MealID: 1, Time: breakfast },
    { MealID: 2, Time: lunch },
    { MealID: 3, Time: dinner },
    { MealID: 4, Time: snack }
  ];

  try {
    const updatePromises = updates.map(({ MealID, Time }) => {
      return new Promise((resolve, reject) => {
        // แปลง HH:MM เป็น HH:MM:00 สำหรับ database
        const fullTime = Time.length === 5 ? `${Time}:00` : Time;

        const query = `
          UPDATE userdefaultmealtime 
          SET Time = ? 
          WHERE UserID = ? AND MealID = ?
        `;

        db.query(query, [fullTime, userId, MealID], (err, result) => {
          if (err) {
            console.error(`Failed to update MealID ${MealID}:`, err);
            reject(err);
          } else {
            console.log(`Updated MealID ${MealID} to ${fullTime}`);
            resolve(result);
          }
        });
      });
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Meal times updated successfully'
    });
  } catch (error) {
    console.error('Error updating meal times:', error);
    res.status(500).json({
      error: 'Failed to update meal times',
      details: error.message
    });
  }
});

// Update meal times
app.patch('/api/meal-times', (req, res) => {
  const { breakfast, lunch, dinner, snack } = req.body;
  const userId = req.params.id;  // ตรวจสอบ user ID

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated or missing user ID' });
  }

  const updates = [
    { MealID: 1, Time: breakfast },
    { MealID: 2, Time: lunch },
    { MealID: 3, Time: dinner },
    { MealID: 4, Time: snack }
  ];

  updates.forEach(({ MealID, Time }) => {
    const query = 'UPDATE userdefaultmealtime SET Time = ? WHERE UserID = ? AND MealID = ?';
    db.query(query, [Time, userId, MealID], (err) => {
      if (err) {
        console.error(`Failed to update meal time for MealID ${MealID}:`, err);  // Log ข้อผิดพลาดในการอัพเดท
        return res.status(500).json({ error: `Failed to update meal time for meal ${MealID}` });
      }
    });
  });

  res.status(200).json({ message: 'Meal times updated successfully' });
});


// เพิ่ม endpoint สร้างกลุ่มโรค (groups)
app.post('/api/groups', (req, res) => {
  const { GroupName, UserID } = req.body;
  if (!GroupName) return res.status(400).json({ error: 'GroupName required' });
  const sql = 'INSERT INTO diseasegroup (GroupName, UserID, CreatedAt) VALUES (?, ?, NOW())';
  db.query(sql, [GroupName, UserID || null], (err, result) => {
    if (err) {
      console.error('create group error', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json({ success: true, id: result.insertId });
  });
});

// สร้างประเภทยา (medicationtype)
app.post('/api/types', (req, res) => {
  const { TypeName, UserID } = req.body;
  if (!TypeName) return res.status(400).json({ error: 'TypeName required' });
  const sql = 'INSERT INTO medicationtype (TypeName, UserID, CreatedAt) VALUES (?, ?, NOW())';
  db.query(sql, [TypeName, UserID || null], (err, result) => {
    if (err) {
      console.error('create type error', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json({ success: true, id: result.insertId });
  });
});

// สร้างหน่วยยา (dosageunit)
app.post('/api/units', (req, res) => {
  const { DosageType, UserID } = req.body;
  if (!DosageType) return res.status(400).json({ error: 'DosageType required' });
  const sql = 'INSERT INTO dosageunit (DosageType, UserID, CreatedAt) VALUES (?, ?, NOW())';
  db.query(sql, [DosageType, UserID || null], (err, result) => {
    if (err) {
      console.error('create unit error', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json({ success: true, id: result.insertId });
  });
});


app.get('/api/history', (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  const from = req.query.from; // expected YYYY-MM-DD
  const to = req.query.to;

  console.log('[GET] /api/history', { userId, from, to });

  if (!userId) return res.status(400).json({ error: 'missing userId' });
  if (!from || !to) return res.status(400).json({ error: 'missing from/to date' });

  const sqlRows = `
    SELECT 
      s.ScheduleID, 
      s.Date, 
      s.Time, 
      s.Status, 
      s.ActualTime, 
      s.SideEffects,
      s.LateMinutes,
      s.IsLate,
      m.MedicationID, 
      m.Name, 
      m.Dosage, 
      du.DosageType, 
      mt.TypeName
    FROM medicationschedule s
    JOIN medication m ON s.MedicationID = m.MedicationID
    LEFT JOIN dosageunit du ON m.UnitID = du.UnitID
    LEFT JOIN medicationtype mt ON m.TypeID = mt.TypeID
    WHERE m.UserID = ? AND s.Date BETWEEN ? AND ?
    ORDER BY s.Date DESC, s.Time ASC
  `;

  const sqlSummary = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) AS taken,
      SUM(CASE WHEN s.Status = 'ข้าม' THEN 1 ELSE 0 END) AS skipped
    FROM medicationschedule s
    JOIN medication m ON s.MedicationID = m.MedicationID
    WHERE m.UserID = ? AND s.Date BETWEEN ? AND ?
  `;

  db.query(sqlRows, [userId, from, to], (err, rows) => {
    if (err) {
      console.error('history rows error', err);
      return res.status(500).json({ error: 'DB error (rows)', details: err.message });
    }
    db.query(sqlSummary, [userId, from, to], (err2, summaryRows) => {
      if (err2) {
        console.error('history summary error', err2);
        return res.status(500).json({ error: 'DB error (summary)', details: err2.message });
      }
      const summary = (summaryRows && summaryRows[0]) ? summaryRows[0] : { total: 0, taken: 0, skipped: 0 };
      res.json({ rows: rows || [], summary });
    });
  });
});

// เพิ่มใน app.js หลัง API อื่นๆ

// API สำหรับบันทึก/อัปเดต log เมื่อมีการเปลี่ยนสถานะ
app.post('/api/medicationlog', async (req, res) => {
  const { medicationId, scheduleId, date, status, sideEffects } = req.body;

  console.log('Received log request:', { medicationId, scheduleId, date, status });

  try {
    if (!scheduleId || !medicationId || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ดึงข้อมูลจำนวนรายการยาในวันนั้น
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as total FROM medicationschedule 
       WHERE MedicationID = ? AND Date = ?`,
      [medicationId, date]
    );
    const totalCount = countResult[0]?.total || 0;

    // นับตามสถานะละเอียด
    const [statusResult] = await db.promise().query(
      `SELECT 
         SUM(CASE WHEN Status = 'กินแล้ว' AND IsLate = 0 THEN 1 ELSE 0 END) as onTime,
         SUM(CASE WHEN Status = 'กินแล้ว' AND IsLate = 1 THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN Status = 'กินแล้ว' THEN 1 ELSE 0 END) as taken,
         SUM(CASE WHEN Status = 'ข้าม' THEN 1 ELSE 0 END) as skipped,
         SUM(CASE WHEN Status = 'ไม่ระบุ' THEN 1 ELSE 0 END) as unknown,
         AVG(CASE WHEN Status = 'กินแล้ว' AND LateMinutes > 0 THEN LateMinutes ELSE NULL END) as avgLateMinutes
       FROM medicationschedule 
       WHERE MedicationID = ? AND Date = ?`,
      [medicationId, date]
    );

    const onTimeCount = statusResult[0]?.onTime || 0;
    const lateCount = statusResult[0]?.late || 0;
    const takenCount = statusResult[0]?.taken || 0;
    const skippedCount = statusResult[0]?.skipped || 0;
    const unknownCount = statusResult[0]?.unknown || 0;
    const avgLateMinutes = parseFloat(statusResult[0]?.avgLateMinutes || 0).toFixed(2);

    const perCount = totalCount > 0 ? ((takenCount / totalCount) * 100).toFixed(2) : 0;

    console.log('Stats:', {
      totalCount, onTimeCount, lateCount, takenCount, skippedCount, unknownCount,
      perCount, avgLateMinutes
    });

    // บันทึก log พร้อมข้อมูลละเอียด
    await db.promise().query(
      `INSERT INTO medicationlog 
       (MedicationID, ScheduleID, \`Count\`, OnTimeCount, LateCount, TakenCount, SkippedCount, UnknownCount, 
        PerCount, AvgLateMinutes, date, Status, SideEffects)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ScheduleID = VALUES(ScheduleID),
         \`Count\` = VALUES(\`Count\`),
         OnTimeCount = VALUES(OnTimeCount),
         LateCount = VALUES(LateCount),
         TakenCount = VALUES(TakenCount),
         SkippedCount = VALUES(SkippedCount),
         UnknownCount = VALUES(UnknownCount),
         PerCount = VALUES(PerCount),
         AvgLateMinutes = VALUES(AvgLateMinutes),
         Status = VALUES(Status),
         SideEffects = VALUES(SideEffects)`,
      [medicationId, scheduleId, totalCount, onTimeCount, lateCount, takenCount, skippedCount, unknownCount,
        perCount, avgLateMinutes, date, status, sideEffects || null]
    );

    res.json({
      success: true,
      perCount,
      takenCount,
      onTimeCount,
      lateCount,
      unknownCount,
      totalCount,
      avgLateMinutes
    });
  } catch (error) {
    console.error('Error updating medication log:', error);
    res.status(500).json({ error: 'Failed to update log', details: error.message });
  }
});

// API สำหรับดึง % ของยาแต่ละตัว
app.get('/api/medicationlog/stats', async (req, res) => {
  const { userId, from, to } = req.query;

  if (!userId || !from || !to) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['userId', 'from', 'to']
    });
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT 
         m.MedicationID,
         m.name as MedicationName,
         COUNT(DISTINCT s.ScheduleID) as TotalScheduled,
         SUM(CASE 
           WHEN s.Status = 'กินแล้ว' AND (s.IsLate = 0 OR s.LateMinutes = 0 OR s.LateMinutes IS NULL) 
           THEN 1 ELSE 0 
         END) as TotalOnTime,
         SUM(CASE 
           WHEN s.Status = 'กินแล้ว' AND s.IsLate = 1 AND s.LateMinutes > 0 
           THEN 1 ELSE 0 
         END) as TotalLate,
         SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) as TotalTaken,
         SUM(CASE WHEN s.Status = 'ข้าม' THEN 1 ELSE 0 END) as TotalSkipped,
         SUM(CASE 
           WHEN s.Status = 'ไม่ระบุ' OR s.Status IS NULL OR s.Status = 'รอกิน' 
           THEN 1 ELSE 0 
         END) as TotalUnknown,
         ROUND(
           (SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) * 100.0 / 
           NULLIF(COUNT(DISTINCT s.ScheduleID), 0)), 2
         ) as AvgPerCount,
         ROUND(AVG(CASE 
           WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 
           THEN s.LateMinutes 
           ELSE NULL 
         END), 2) as AvgLateMinutes
       FROM medication m
       LEFT JOIN medicationschedule s 
         ON m.MedicationID = s.MedicationID 
         AND s.Date BETWEEN ? AND ?
       WHERE m.UserID = ?
         AND m.IsActive = 1
       GROUP BY m.MedicationID, m.name
       HAVING TotalScheduled > 0
       ORDER BY AvgPerCount DESC, m.name ASC`,
      [from, to, userId]
    );

    // แปลง null เป็น 0 สำหรับทุก field
    const processedRows = rows.map(row => ({
      ...row,
      TotalScheduled: parseInt(row.TotalScheduled) || 0,
      TotalOnTime: parseInt(row.TotalOnTime) || 0,
      TotalLate: parseInt(row.TotalLate) || 0,
      TotalTaken: parseInt(row.TotalTaken) || 0,
      TotalSkipped: parseInt(row.TotalSkipped) || 0,
      TotalUnknown: parseInt(row.TotalUnknown) || 0,
      AvgPerCount: parseFloat(row.AvgPerCount) || 0,
      AvgLateMinutes: parseFloat(row.AvgLateMinutes) || 0
    }));

    console.log(`Fetched stats for ${processedRows.length} medications`);

    res.json(processedRows);
  } catch (error) {
    console.error('Error fetching medication stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      details: error.message
    });
  }
});


// API สำหรับดึงข้อมูล summary แบบละเอียด
app.get('/api/history/summary', async (req, res) => {
  const { userId, from, to, lateThresholdHours = 1 } = req.query;

  const lateThresholdMinutes = Math.round(parseFloat(lateThresholdHours) * 60);

  console.log('Fetching summary with threshold:', {
    lateThresholdHours,
    lateThresholdMinutes
  });

  try {
    const [result] = await db.promise().query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE 
           WHEN s.Status = 'กินแล้ว' AND (s.IsLate = 0 OR s.LateMinutes = 0 OR s.LateMinutes IS NULL) 
           THEN 1 ELSE 0 
         END) AS onTime,
         SUM(CASE 
           WHEN s.Status = 'กินแล้ว' AND s.IsLate = 1 AND s.LateMinutes >= ? 
           THEN 1 ELSE 0 
         END) AS late,
         SUM(CASE 
           WHEN s.Status = 'กินแล้ว' AND s.IsLate = 1 AND s.LateMinutes > 0 AND s.LateMinutes < ? 
           THEN 1 ELSE 0 
         END) AS slightlyLate,
         SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) AS taken,
         SUM(CASE WHEN s.Status = 'ข้าม' THEN 1 ELSE 0 END) AS skipped,
         SUM(CASE WHEN s.Status = 'ไม่ระบุ' OR s.Status IS NULL THEN 1 ELSE 0 END) AS unknown,
         ROUND(AVG(CASE 
           WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 
           THEN s.LateMinutes 
           ELSE NULL 
         END), 2) AS avgLateMinutes
       FROM medicationschedule s
       JOIN medication m ON s.MedicationID = m.MedicationID
       WHERE m.UserID = ? AND s.Date BETWEEN ? AND ?`,
      [lateThresholdMinutes, lateThresholdMinutes, userId, from, to]
    );

    const summary = result[0] || {
      total: 0,
      onTime: 0,
      late: 0,
      slightlyLate: 0,
      taken: 0,
      skipped: 0,
      unknown: 0,
      avgLateMinutes: 0
    };

    // แปลงค่า null เป็น 0
    Object.keys(summary).forEach(key => {
      if (summary[key] === null) summary[key] = 0;
    });

    summary.avgLateMinutes = parseFloat(summary.avgLateMinutes || 0).toFixed(2);
    summary.avgLateHours = (summary.avgLateMinutes / 60).toFixed(2);

    console.log('Summary result:', summary);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      error: 'Failed to fetch summary',
      details: error.message
    });
  }
});

// API แก้ไข/ลบ กลุ่มโรค (Groups)
// PUT /api/groups/:id - แก้ไขกลุ่มโรค
app.put('/api/groups/:id', (req, res) => {
  const groupId = req.params.id;
  const { GroupName, UserID } = req.body;

  if (!GroupName) {
    return res.status(400).json({ error: 'GroupName is required' });
  }

  const sql = 'UPDATE diseasegroup SET GroupName = ?, UserID = ? WHERE GroupID = ?';
  db.query(sql, [GroupName, UserID || null, groupId], (err, result) => {
    if (err) {
      console.error('Update group error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ success: true, message: 'Group updated successfully' });
  });
});

// DELETE /api/groups/:id - ลบกลุ่มโรค
app.delete('/api/groups/:id', (req, res) => {
  const groupId = req.params.id;

  // ตรวจสอบว่ามียาที่ใช้กลุ่มนี้อยู่หรือไม่
  const checkSql = 'SELECT COUNT(*) as count FROM medication WHERE GroupID = ?';
  db.query(checkSql, [groupId], (err, result) => {
    if (err) {
      console.error('Check group usage error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    const count = result[0]?.count || 0;
    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete group',
        message: `มียา ${count} รายการที่ใช้กลุ่มนี้อยู่`
      });
    }

    // ลบกลุ่ม
    const deleteSql = 'DELETE FROM diseasegroup WHERE GroupID = ?';
    db.query(deleteSql, [groupId], (err2, result2) => {
      if (err2) {
        console.error('Delete group error:', err2);
        return res.status(500).json({ error: 'Database error', details: err2.message });
      }

      if (result2.affectedRows === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }

      res.json({ success: true, message: 'Group deleted successfully' });
    });
  });
});


//  API แก้ไข/ลบ ประเภทยา (Types)
// PUT /api/types/:id - แก้ไขประเภทยา
app.put('/api/types/:id', (req, res) => {
  const typeId = req.params.id;
  const { TypeName, UserID } = req.body;

  if (!TypeName) {
    return res.status(400).json({ error: 'TypeName is required' });
  }

  const sql = 'UPDATE medicationtype SET TypeName = ?, UserID = ? WHERE TypeID = ?';
  db.query(sql, [TypeName, UserID || null, typeId], (err, result) => {
    if (err) {
      console.error('Update type error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Type not found' });
    }

    res.json({ success: true, message: 'Type updated successfully' });
  });
});

// DELETE /api/types/:id - ลบประเภทยา
app.delete('/api/types/:id', (req, res) => {
  const typeId = req.params.id;

  // ตรวจสอบว่ามียาที่ใช้ประเภทนี้อยู่หรือไม่
  const checkSql = 'SELECT COUNT(*) as count FROM medication WHERE TypeID = ?';
  db.query(checkSql, [typeId], (err, result) => {
    if (err) {
      console.error('Check type usage error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    const count = result[0]?.count || 0;
    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete type',
        message: `มียา ${count} รายการที่ใช้ประเภทนี้อยู่`
      });
    }

    // ลบประเภท
    const deleteSql = 'DELETE FROM medicationtype WHERE TypeID = ?';
    db.query(deleteSql, [typeId], (err2, result2) => {
      if (err2) {
        console.error('Delete type error:', err2);
        return res.status(500).json({ error: 'Database error', details: err2.message });
      }

      if (result2.affectedRows === 0) {
        return res.status(404).json({ error: 'Type not found' });
      }

      res.json({ success: true, message: 'Type deleted successfully' });
    });
  });
});


//  API แก้ไข/ลบ หน่วยยา (Units)
// PUT /api/units/:id - แก้ไขหน่วยยา
app.put('/api/units/:id', (req, res) => {
  const unitId = req.params.id;
  const { DosageType, UserID } = req.body;

  if (!DosageType) {
    return res.status(400).json({ error: 'DosageType is required' });
  }

  const sql = 'UPDATE dosageunit SET DosageType = ?, UserID = ? WHERE UnitID = ?';
  db.query(sql, [DosageType, UserID || null, unitId], (err, result) => {
    if (err) {
      console.error('Update unit error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json({ success: true, message: 'Unit updated successfully' });
  });
});

// DELETE /api/units/:id - ลบหน่วยยา
app.delete('/api/units/:id', (req, res) => {
  const unitId = req.params.id;

  // ตรวจสอบว่ามียาที่ใช้หน่วยนี้อยู่หรือไม่
  const checkSql = 'SELECT COUNT(*) as count FROM medication WHERE UnitID = ?';
  db.query(checkSql, [unitId], (err, result) => {
    if (err) {
      console.error('Check unit usage error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    const count = result[0]?.count || 0;
    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete unit',
        message: `มียา ${count} รายการที่ใช้หน่วยนี้อยู่`
      });
    }

    // ลบหน่วย
    const deleteSql = 'DELETE FROM dosageunit WHERE UnitID = ?';
    db.query(deleteSql, [unitId], (err2, result2) => {
      if (err2) {
        console.error('Delete unit error:', err2);
        return res.status(500).json({ error: 'Database error', details: err2.message });
      }

      if (result2.affectedRows === 0) {
        return res.status(404).json({ error: 'Unit not found' });
      }

      res.json({ success: true, message: 'Unit deleted successfully' });
    });
  });
});

// ค่า tolerance สำหรับความช้า (นาที)  ที่ Frontend ใน HomeScreen
const DEFAULT_TOLERANCE_MINUTES = 5;

// ฟังก์ชันคำนวณเวลาที่กินช้า
const calculateLateMinutes = (scheduledTime, actualTime, toleranceMinutes = DEFAULT_TOLERANCE_MINUTES) => {
  if (!scheduledTime || !actualTime) return { lateMinutes: null, isLate: 0, timingNote: 'ไม่ระบุ' };

  try {
    const scheduled = new Date(`1970-01-01T${scheduledTime}`);
    const actual = new Date(`1970-01-01T${actualTime}`);

    if (isNaN(scheduled) || isNaN(actual)) return { lateMinutes: null, isLate: 0, timingNote: 'ไม่ระบุ' };

    const diffMs = actual - scheduled;
    const diffMinutes = Math.floor(diffMs / 60000);

    // ถ้าภายใน ±tolerance นาที ถือว่าตรงเวลา
    if (Math.abs(diffMinutes) <= toleranceMinutes) {
      return {
        lateMinutes: 0,
        isLate: 0,
        timingNote: 'ตรงเวลา'
      };
    }

    // ถ้าเกินกว่า tolerance นาที ถือว่ากินช้า
    if (diffMinutes > toleranceMinutes) {
      return {
        lateMinutes: diffMinutes,
        isLate: 1,
        timingNote: 'กินช้า'
      };
    }

    // ถ้าก่อนเวลามากกว่า tolerance ถือว่ากินก่อนเวลา (ไม่บ่อย แต่ต้องรองรับ)
    return {
      lateMinutes: 0,
      isLate: 0,
      timingNote: 'ตรงเวลา'
    };
  } catch (err) {
    console.error('Error in calculateLateMinutes:', err);
    return { lateMinutes: null, isLate: 0, timingNote: 'ไม่ระบุ' };
  }
};

//  ฟังก์ชัน Auto-update Status เป็น "ไม่ระบุ" สำหรับยาที่เลยเวลา
const autoUpdateExpiredSchedules = () => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];

  const sql = `
    UPDATE medicationschedule 
    SET Status = 'ไม่ระบุ' 
    WHERE Status = 'รอกิน' 
      AND Date < ? 
  `;

  db.query(sql, [currentDate], (err, result) => {
    if (err) {
      console.error('Auto-update expired schedules error:', err);
    } else if (result.affectedRows > 0) {
      console.log(` Auto-updated ${result.affectedRows} expired schedules to "ไม่ระบุ"`);
    }
  });
};

//  เรียก auto-update ทุก 5 นาที
setInterval(autoUpdateExpiredSchedules, 1 * 60 * 1000);
autoUpdateExpiredSchedules(); // เรียกทันทีตอน start server


// เพิ่ม API สำหรับดึงสถิติเชิงลึก
app.get('/api/medicationlog/advanced-stats', async (req, res) => {
  const { userId, from, to } = req.query;

  if (!userId || !from || !to) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['userId', 'from', 'to']
    });
  }

  try {
    // 1. สถิติแต่ละยา (รายละเอียด)
    const [medications] = await db.promise().query(
      `SELECT 
         m.MedicationID,
         m.name as MedicationName,
         COUNT(DISTINCT s.ScheduleID) as TotalScheduled,
         SUM(CASE WHEN s.Status = 'กินแล้ว' AND (s.IsLate = 0 OR s.LateMinutes = 0) THEN 1 ELSE 0 END) as TotalOnTime,
         SUM(CASE WHEN s.Status = 'กินแล้ว' AND s.IsLate = 1 AND s.LateMinutes > 0 THEN 1 ELSE 0 END) as TotalLate,
         SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) as TotalTaken,
         SUM(CASE WHEN s.Status = 'ข้าม' THEN 1 ELSE 0 END) as TotalSkipped,
         MIN(CASE WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 THEN s.LateMinutes ELSE NULL END) as MinLateMinutes,
         MAX(CASE WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 THEN s.LateMinutes ELSE NULL END) as MaxLateMinutes,
         AVG(CASE WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 THEN s.LateMinutes ELSE NULL END) as AvgLateMinutes,
         SUM(CASE WHEN s.SideEffects IS NOT NULL AND s.SideEffects != '' THEN 1 ELSE 0 END) as SideEffectsCount,
         GROUP_CONCAT(DISTINCT s.SideEffects SEPARATOR '; ') as SideEffectsList
       FROM medication m
       LEFT JOIN medicationschedule s 
         ON m.MedicationID = s.MedicationID 
         AND s.Date BETWEEN ? AND ?
       WHERE m.UserID = ? AND m.IsActive = 1
       GROUP BY m.MedicationID, m.name
       HAVING TotalScheduled > 0
       ORDER BY TotalTaken DESC`,
      [from, to, userId]
    );

    // 2. สถิติตามช่วงเวลา (Morning/Afternoon/Evening/Night)
    const [timeDistribution] = await db.promise().query(
      `SELECT 
         CASE
           WHEN HOUR(s.Time) BETWEEN 6 AND 11 THEN 'เช้า'
           WHEN HOUR(s.Time) BETWEEN 12 AND 16 THEN 'กลางวัน'
           WHEN HOUR(s.Time) BETWEEN 17 AND 20 THEN 'เย็น'
           ELSE 'ก่อนนอน'
         END as Period,
         COUNT(*) as Total,
         SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) as Taken,
         AVG(CASE WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 THEN s.LateMinutes ELSE NULL END) as AvgLate
       FROM medicationschedule s
       JOIN medication m ON s.MedicationID = m.MedicationID
       WHERE m.UserID = ? AND s.Date BETWEEN ? AND ?
       GROUP BY Period
       ORDER BY FIELD(Period, 'เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน')`,
      [userId, from, to]
    );

    // 3. สถิติตามวัน (Daily Trend)
    const [dailyTrend] = await db.promise().query(
      `SELECT 
         s.Date,
         COUNT(*) as Total,
         SUM(CASE WHEN s.Status = 'กินแล้ว' THEN 1 ELSE 0 END) as Taken,
         AVG(CASE WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 THEN s.LateMinutes ELSE NULL END) as AvgLate
       FROM medicationschedule s
       JOIN medication m ON s.MedicationID = m.MedicationID
       WHERE m.UserID = ? AND s.Date BETWEEN ? AND ?
       GROUP BY s.Date
       ORDER BY s.Date`,
      [userId, from, to]
    );

    // แปลงข้อมูล
    const processedMedications = medications.map(row => ({
      ...row,
      TotalScheduled: parseInt(row.TotalScheduled) || 0,
      TotalOnTime: parseInt(row.TotalOnTime) || 0,
      TotalLate: parseInt(row.TotalLate) || 0,
      TotalTaken: parseInt(row.TotalTaken) || 0,
      TotalSkipped: parseInt(row.TotalSkipped) || 0,
      MinLateMinutes: parseFloat(row.MinLateMinutes) || null,
      MaxLateMinutes: parseFloat(row.MaxLateMinutes) || null,
      AvgLateMinutes: parseFloat(row.AvgLateMinutes) || 0,
      SideEffectsCount: parseInt(row.SideEffectsCount) || 0,
      AdherenceRate: row.TotalScheduled > 0 ? ((row.TotalTaken / row.TotalScheduled) * 100).toFixed(1) : 0,
      OnTimeRate: row.TotalTaken > 0 ? ((row.TotalOnTime / row.TotalTaken) * 100).toFixed(1) : 0,
      ComplianceScore: calculateComplianceScore(row)
    }));

    res.json({
      medications: processedMedications,
      timeDistribution: timeDistribution.map(row => ({
        ...row,
        Total: parseInt(row.Total) || 0,
        Taken: parseInt(row.Taken) || 0,
        AvgLate: parseFloat(row.AvgLate) || 0,
        AdherenceRate: row.Total > 0 ? ((row.Taken / row.Total) * 100).toFixed(1) : 0
      })),
      dailyTrend: dailyTrend.map(row => ({
        ...row,
        Total: parseInt(row.Total) || 0,
        Taken: parseInt(row.Taken) || 0,
        AvgLate: parseFloat(row.AvgLate) || 0,
        AdherenceRate: row.Total > 0 ? ((row.Taken / row.Total) * 100).toFixed(1) : 0
      }))
    });
  } catch (error) {
    console.error('Error fetching advanced stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      details: error.message
    });
  }
});

// ฟังก์ชันคำนวณ Compliance Score (0-100)
function calculateComplianceScore(row) {
  const adherenceWeight = 0.5; // 50%
  const onTimeWeight = 0.3;    // 30%
  const sideEffectPenalty = 0.2; // 20%

  const adherenceScore = row.TotalScheduled > 0
    ? (row.TotalTaken / row.TotalScheduled) * 100
    : 0;

  const onTimeScore = row.TotalTaken > 0
    ? (row.TotalOnTime / row.TotalTaken) * 100
    : 0;

  const sideEffectScore = row.TotalTaken > 0
    ? Math.max(0, 100 - ((row.SideEffectsCount / row.TotalTaken) * 100))
    : 100;

  const score = (
    (adherenceScore * adherenceWeight) +
    (onTimeScore * onTimeWeight) +
    (sideEffectScore * sideEffectPenalty)
  ).toFixed(1);

  return parseFloat(score);
}

// เพิ่ม API สำหรับดึงสถิติช่วงเวลาของยาแต่ละตัว
app.get('/api/medicationlog/medication-time-stats', async (req, res) => {
  const { userId, medicationId, from, to } = req.query;

  if (!userId || !from || !to) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['userId', 'from', 'to']
    });
  }

  try {
    // ถ้าระบุ medicationId ให้ดึงเฉพาะยาตัวนั้น, ไม่ระบุให้ดึงทั้งหมด
    const medicationFilter = medicationId ? 'AND m.MedicationID = ?' : '';
    const params = medicationId
      ? [userId, from, to, medicationId]
      : [userId, from, to];

    const [results] = await db.promise().query(
      `SELECT 
         m.MedicationID,
         m.name as MedicationName,
         CASE
           WHEN HOUR(s.Time) BETWEEN 6 AND 11 THEN 'เช้า'
           WHEN HOUR(s.Time) BETWEEN 12 AND 16 THEN 'กลางวัน'
           WHEN HOUR(s.Time) BETWEEN 17 AND 20 THEN 'เย็น'
           ELSE 'ก่อนนอน'
         END as Period,
         COUNT(*) as Total,
         SUM(CASE WHEN s.Status = 'กินแล้ว' AND (s.IsLate = 0 OR s.LateMinutes = 0) THEN 1 ELSE 0 END) as OnTime,
         SUM(CASE WHEN s.Status = 'กินแล้ว' AND s.IsLate = 1 AND s.LateMinutes > 0 THEN 1 ELSE 0 END) as Late,
         SUM(CASE WHEN s.Status = 'ข้าม' THEN 1 ELSE 0 END) as Skipped,
         SUM(CASE WHEN s.Status = 'ไม่ระบุ' OR s.Status = 'รอกิน' THEN 1 ELSE 0 END) as Unspecified,
         AVG(CASE WHEN s.Status = 'กินแล้ว' AND s.LateMinutes > 0 THEN s.LateMinutes ELSE NULL END) as AvgLate
       FROM medication m
       LEFT JOIN medicationschedule s 
         ON m.MedicationID = s.MedicationID 
         AND s.Date BETWEEN ? AND ?
       WHERE m.UserID = ? AND m.IsActive = 1 ${medicationFilter}
       GROUP BY m.MedicationID, m.name, Period
       HAVING Total > 0
       ORDER BY m.name, FIELD(Period, 'เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน')`,
      params
    );

    // จัดกลุ่มตามยา
    const groupedByMedication = results.reduce((acc, row) => {
      const medId = row.MedicationID;
      if (!acc[medId]) {
        acc[medId] = {
          MedicationID: medId,
          MedicationName: row.MedicationName,
          periods: []
        };
      }

      acc[medId].periods.push({
        Period: row.Period,
        Total: parseInt(row.Total) || 0,
        OnTime: parseInt(row.OnTime) || 0,
        Late: parseInt(row.Late) || 0,
        Skipped: parseInt(row.Skipped) || 0,
        Unspecified: parseInt(row.Unspecified) || 0,
        AvgLate: parseFloat(row.AvgLate) || 0,
        AdherenceRate: row.Total > 0
          ? (((parseInt(row.OnTime) + parseInt(row.Late)) / parseInt(row.Total)) * 100).toFixed(1)
          : 0
      });

      return acc;
    }, {});

    res.json(Object.values(groupedByMedication));
  } catch (error) {
    console.error('Error fetching medication time stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      details: error.message
    });
  }
});

//  รัน server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

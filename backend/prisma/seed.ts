import { PrismaClient, UserRole, FeeStatus, FeeType, PaymentMethod, AttendanceStatus, GradeType, TermType, EventType, NotificationType, BookStatus, BusStatus, RouteStatus, EmploymentType, PayrollStatus, LeaveType, LeaveStatus, ExamType, AdmissionStatus, EnrollmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; }
function daysAhead(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(0,0,0,0); return d; }


function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const FIRST_NAMES = ['Aarav', 'Aisha', 'Arjun', 'Ananya', 'Advait', 'Anika', 'Dev', 'Diya', 'Esha', 'Farhan', 'Gauri', 'Harsha', 'Ishaan', 'Jiya', 'Kabir', 'Lakshmi', 'Manav', 'Nisha', 'Om', 'Pari', 'Rahul', 'Saanvi', 'Tara', 'Vihaan', 'Zara', 'Yash', 'Neel', 'Mira', 'Rohan', 'Sara', 'Kavya', 'Ishan', 'Riya', 'Aryan', 'Meera', 'Varun', 'Pooja', 'Nikhil', 'Shreya', 'Aditya'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Iyer', 'Singh', 'Kumar', 'Nair', 'Gupta', 'Mehta', 'Joshi', 'Chopra', 'Bose', 'Rao', 'Das', 'Bhat', 'Khan', 'Saxena', 'Malhotra', 'Kulkarni'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female'];
const SUBJECT_NAMES = [
  { name: 'Mathematics', code: 'MATH' },
  { name: 'English Language', code: 'ENG' },
  { name: 'Science', code: 'SCI' },
  { name: 'Social Studies', code: 'SST' },
  { name: 'Computer Science', code: 'CS' },
  { name: 'Hindi', code: 'HIN' },
  { name: 'Physics', code: 'PHY' },
  { name: 'Chemistry', code: 'CHE' },
  { name: 'Biology', code: 'BIO' },
  { name: 'Economics', code: 'ECO' },
  { name: 'Geography', code: 'GEO' },
  { name: 'History', code: 'HIS' },
];
const TEACHER_DESIGNATIONS = ['Senior Teacher', 'Subject Teacher', 'Department Head', 'Assistant Teacher', 'Lab Instructor'];
const DEPARTMENTS = ['Mathematics', 'Science', 'Languages', 'Humanities', 'Computer Science'];
const LIBRARY_BOOKS = [
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', isbn: '978-0-7432-7356-5' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', isbn: '978-0-06-112008-4' },
  { title: '1984', author: 'George Orwell', category: 'Fiction', isbn: '978-0-452-28423-4' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Classics', isbn: '978-0-14-143951-8' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasy', isbn: '978-0-547-92822-7' },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', isbn: '978-0-553-38016-3' },
  { title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', category: 'History', isbn: '978-0-06-231609-7' },
  { title: 'The Selfish Gene', author: 'Richard Dawkins', category: 'Science', isbn: '978-0-19-878860-7' },
  { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', category: 'Autobiography', isbn: '978-8-17-371146-6' },
  { title: 'The Discovery of India', author: 'Jawaharlal Nehru', category: 'History', isbn: '978-0-14-303103-1' },
  { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', category: 'Fantasy', isbn: '978-0-439-70816-2' },
  { title: 'The Alchemist', author: 'Paulo Coelho', category: 'Philosophy', isbn: '978-0-06-112241-5' },
  { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', category: 'Finance', isbn: '978-1-61-268019-4' },
  { title: 'Think and Grow Rich', author: 'Napoleon Hill', category: 'Self-help', isbn: '978-1-58-542433-7' },
  { title: 'The Diary of a Young Girl', author: 'Anne Frank', category: 'Biography', isbn: '978-0-55-329698-3' },
  { title: 'Animal Farm', author: 'George Orwell', category: 'Classics', isbn: '978-0-45-152634-2' },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', category: 'Classics', isbn: '978-0-31-676948-8' },
  { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', category: 'Fantasy', isbn: '978-0-54-400341-5' },
  { title: 'Dune', author: 'Frank Herbert', category: 'Sci-Fi', isbn: '978-0-44-117271-9' },
  { title: 'The Da Vinci Code', author: 'Dan Brown', category: 'Thriller', isbn: '978-0-30-747427-8' },
];

async function main() {
  console.log('🌱 Seeding comprehensive school data...');
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  // ========== ACADEMIC STRUCTURE ==========
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 'ay-2024-2025' },
    update: {},
    create: {
      id: 'ay-2024-2025',
      name: '2024-2025 Academic Year',
      startDate: daysAgo(340),
      endDate: daysAhead(25),
      status: 'ACTIVE',
      description: 'Main academic year 2024-2025',
    },
  });

  const term1 = await prisma.term.upsert({
    where: { id: 'term-1-2024' },
    update: {},
    create: {
      id: 'term-1-2024',
      academicYearId: academicYear.id,
      name: 'Fall Semester 2024',
      type: TermType.SEMESTER,
      startDate: daysAgo(180),
      endDate: daysAgo(5),
      isActive: true,
    },
  });

  const term2 = await prisma.term.upsert({
    where: { id: 'term-2-2025' },
    update: {},
    create: {
      id: 'term-2-2025',
      academicYearId: academicYear.id,
      name: 'Spring Semester 2025',
      type: TermType.SEMESTER,
      startDate: daysAgo(4),
      endDate: daysAhead(25),
      isActive: false,
    },
  });
  console.log('✅ Academic year + 2 terms');

  // ========== ADMINS ==========
  const admin = await prisma.user.upsert({
    where: { email: 'admin@educore.dev' },
    update: {},
    create: {
      email: 'admin@educore.dev',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      phone: '+91 98220 10001',
    },
  });
  await prisma.staffRecord.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      employeeId: 'EMP-001',
      department: 'Administration',
      designation: 'Principal',
      employmentType: EmploymentType.FULL_TIME,
      basicSalary: 120000,
      allowances: 30000,
      deductions: 15000,
      bankName: 'HDFC Bank',
      bankAccountNo: '50200012345678',
      ifscCode: 'HDFC0000123',
      joinedAt: new Date('2015-04-01'),
    },
  });
  console.log('✅ Admin (Principal) created');

  // ========== TEACHERS (12) ==========
  const teachers: any[] = [];
  const teacherNames = [
    ['Sarah', 'Johnson'], ['Rajesh', 'Kumar'], ['Emily', 'Davis'], ['Vikram', 'Singh'],
    ['Priya', 'Sharma'], ['David', 'Wilson'], ['Anita', 'Desai'], ['Robert', 'Brown'],
    ['Sunita', 'Rao'], ['James', 'Taylor'], ['Kavita', 'Nair'], ['Arjun', 'Mehta'],
  ];
  for (let i = 0; i < teacherNames.length; i++) {
    const [f, l] = teacherNames[i];
    const email = `teacher${i + 1}@educore.dev`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: hashedPassword,
        firstName: f,
        lastName: l,
        role: UserRole.TEACHER,
        status: 'ACTIVE',
        phone: `+91 98${randInt(10000000, 99999999)}`,
        dateOfBirth: new Date(`${randInt(1975, 1990)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`),
        address: `${randInt(1, 99)} MG Road, Bengaluru`,
      },
    });
    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        employeeId: `TCH-2024-${String(i + 1).padStart(3, '0')}`,
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        designation: TEACHER_DESIGNATIONS[i % TEACHER_DESIGNATIONS.length],
        qualification: i % 2 === 0 ? 'M.Ed' : 'M.Sc',
        specialization: SUBJECT_NAMES[i % SUBJECT_NAMES.length].name,
        hireDate: new Date(`${randInt(2016, 2023)}-${String(randInt(1, 12)).padStart(2, '0')}-15`),
        isVerified: true,
      },
    });
    await prisma.staffRecord.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        employeeId: `TCH-2024-${String(i + 1).padStart(3, '0')}`,
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        designation: TEACHER_DESIGNATIONS[i % TEACHER_DESIGNATIONS.length],
        employmentType: i % 4 === 0 ? EmploymentType.CONTRACT : EmploymentType.FULL_TIME,
        basicSalary: randInt(45000, 90000),
        allowances: randInt(5000, 20000),
        deductions: randInt(3000, 10000),
        bankName: pick(['SBI', 'HDFC', 'ICICI', 'Axis']),
        bankAccountNo: `502${randInt(1000000000, 9999999999)}`,
        ifscCode: 'SBIN0000001',
        joinedAt: new Date(`${randInt(2016, 2023)}-${String(randInt(1, 12)).padStart(2, '0')}-15`),
      },
    });
    teachers.push({ user, profile });
  }
  console.log('✅ 12 teachers + staff records');

  // ========== SUBJECTS ==========
  const subjects: any[] = [];
  for (const [i, s] of SUBJECT_NAMES.entries()) {
    const subject = await prisma.subject.upsert({
      where: { id: `subj-${i + 1}` },
      update: {},
      create: {
        id: `subj-${i + 1}`,
        name: s.name,
        code: s.code,
        isCore: true,
        credits: 1,
        description: `${s.name} course for secondary grades`,
      },
    });
    subjects.push(subject);
  }
  console.log('✅ 12 subjects');

  // ========== CLASSES (Grade 6-12, A/B sections) ==========
  const classes: any[] = [];
  let classCounter = 0;
  for (let grade = 6; grade <= 12; grade++) {
    for (const section of ['A', 'B']) {
      const cls = await prisma.class.upsert({
        where: { id: `class-${grade}-${section}` },
        update: {},
        create: {
          id: `class-${grade}-${section}`,
          name: `Grade ${grade}${section}`,
          gradeLevel: grade,
          section,
          academicYearId: academicYear.id,
          teacherId: teachers[classCounter % teachers.length].profile.id,
          roomNumber: `Room ${100 + classCounter}`,
          capacity: 30,
          description: `Grade ${grade} Section ${section}`,
        },
      });
      // Assign 6 subjects per class
      for (let s = 0; s < 6; s++) {
        const subjectId = subjects[(classCounter + s) % subjects.length].id;
        await prisma.classSubject.upsert({
          where: { classId_subjectId: { classId: cls.id, subjectId } },
          update: {},
          create: {
            classId: cls.id,
            subjectId,
            teacherId: teachers[(classCounter + s) % teachers.length].profile.id,
            weeklyHours: s < 3 ? 5 : 3,
          },
        });
      }
      classes.push(cls);
      classCounter++;
    }
  }
  console.log('✅ 14 classes (Grade 6-12, A/B) with subjects');

  // ========== STUDENTS (40) + PARENTS ==========
  const students: any[] = [];
  for (let i = 0; i < 40; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const email = `student${i + 1}@educore.dev`;
    const grade = 6 + Math.floor(i / 6);
    const section = i % 2 === 0 ? 'A' : 'B';
    const classId = `class-${grade}-${section}`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        phone: `+91 9${randInt(100000000, 999999999)}`,
        dateOfBirth: new Date(`${2024 - grade - 5}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`),
        address: `${randInt(1, 999)} ${pick(['MG Road', 'Park Street', 'Lake View', 'Gandhi Nagar', 'Rose Garden'])} , Bengaluru`,
      },
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        studentId: `STD-2024-${String(i + 1).padStart(3, '0')}`,
        enrollmentNumber: `ENR-2024-${String(i + 1).padStart(3, '0')}`,
        admissionDate: new Date(`2024-08-${String(randInt(15, 25)).padStart(2, '0')}`),
        bloodGroup: pick(BLOOD_GROUPS),
        emergencyContact: `+91 9${randInt(100000000, 999999999)}`,
        medicalNotes: i % 7 === 0 ? 'Mild asthma, needs inhaler in PE class' : null,
        classId,
        isVerified: true,
      },
    });

    // Parent profile
    const parentEmail = `parent${i + 1}@educore.dev`;
    const parent = await prisma.user.upsert({
      where: { email: parentEmail },
      update: {},
      create: {
        email: parentEmail,
        password: hashedPassword,
        firstName: `Mr. ${lastName}`,
        lastName: '',
        role: UserRole.PARENT,
        status: 'ACTIVE',
        phone: `+91 9${randInt(100000000, 999999999)}`,
      },
    });
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parent.id },
      update: {},
      create: {
        userId: parent.id,
        occupation: pick(['Engineer', 'Doctor', 'Business Owner', 'Teacher', 'Banker', 'Lawyer', 'Architect']),
        relationship: 'Father',
        isVerified: true,
      },
    });
    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: parentProfile.id, studentId: profile.id } },
      update: {},
      create: {
        parentId: parentProfile.id,
        studentId: profile.id,
        relationship: 'Father',
        isPrimary: true,
      },
    });

    // Enrollment
    await prisma.enrollment.upsert({
      where: { studentId_classId_academicYearId: { studentId: profile.id, classId, academicYearId: academicYear.id } },
      update: {},
      create: {
        studentId: profile.id,
        classId,
        academicYearId: academicYear.id,
        enrollmentDate: new Date('2024-08-20'),
        status: EnrollmentStatus.ACTIVE,
      },
    });

    students.push({ user, profile, classId, grade, name: `${firstName} ${lastName}` });
  }
  console.log('✅ 40 students + parents + enrollments');

  // ========== TIMETABLE (full week for all classes) ==========
  const periods = [
    { start: '08:00', end: '08:45' }, { start: '08:50', end: '09:35' }, { start: '09:40', end: '10:25' },
    { start: '10:30', end: '11:15' }, { start: '11:20', end: '12:05' }, { start: '13:00', end: '13:45' },
    { start: '13:50', end: '14:35' }, { start: '14:40', end: '15:25' },
  ];
  let ttId = 0;
  for (const cls of classes) {
    const classSubjects = await prisma.classSubject.findMany({ where: { classId: cls.id } });
    for (let day = 1; day <= 5; day++) {
      for (let period = 0; period < 6; period++) {
        const cs = classSubjects[(period + day) % classSubjects.length];
        ttId++;
        await prisma.timetableEntry.upsert({
          where: { id: `tt-${ttId}` },
          update: {},
          create: {
            id: `tt-${ttId}`,
            classId: cls.id,
            subjectId: cs.subjectId,
            teacherId: cs.teacherId ?? teachers[0].profile.id,
            academicYearId: academicYear.id,
            dayOfWeek: day,
            startTime: periods[period].start,
            endTime: periods[period].end,
            roomNumber: cls.roomNumber,
            isRecurring: true,
            effectiveFrom: new Date('2024-09-01'),
          },
        });
      }
    }
  }
  console.log('✅ Full weekly timetables for all 14 classes');

  // ========== ATTENDANCE (Sept 1 - Nov 15, all school days) ==========
  const attendanceDates: Date[] = [];
  for (let n = 55; n >= 0; n--) {
    const d = daysAgo(n);
    if (d.getDay() !== 0 && d.getDay() !== 6) attendanceDates.push(d);
  }
  let attId = 0;
  for (const student of students) {
    const classSubjects = await prisma.classSubject.findMany({ where: { classId: student.classId }, include: { subject: true } });
    for (const date of attendanceDates) {
      // Mark attendance for first 2 periods of each day
      for (let p = 0; p < 2; p++) {
        const subjectId = classSubjects[(date.getDate() + p) % classSubjects.length].subjectId;
        // 92% present, 4% absent, 2% late, 2% excused
        const r = Math.random();
        const status = r < 0.92 ? AttendanceStatus.PRESENT : r < 0.96 ? AttendanceStatus.ABSENT : r < 0.98 ? AttendanceStatus.LATE : AttendanceStatus.EXCUSED;
        attId++;
        await prisma.attendanceRecord.upsert({
          where: { id: `att-${attId}` },
          update: {},
          create: {
            id: `att-${attId}`,
            studentId: student.profile.id,
            classId: student.classId,
            subjectId,
            date,
            status,
            remarks: status !== AttendanceStatus.PRESENT ? (status === AttendanceStatus.ABSENT ? 'Absent' : 'Marked by teacher') : null,
            recordedBy: teachers[student.grade % teachers.length].user.id,
          },
        });
      }
    }
  }
  console.log(`✅ ${attId} attendance records (2 months)`);

  // ========== GRADES (per student per subject) ==========
  let gradeId = 0;
  for (const student of students) {
    const classSubjects = await prisma.classSubject.findMany({ where: { classId: student.classId }, include: { subject: true } });
    for (let s = 0; s < classSubjects.length; s++) {
      const base = randInt(55, 98);
      const gradeTypes = [GradeType.QUIZ, GradeType.ASSIGNMENT, GradeType.MIDTERM, GradeType.PROJECT];
      for (let g = 0; g < gradeTypes.length; g++) {
        gradeId++;
        const score = Math.min(100, Math.max(30, base + randInt(-15, 8)));
        await prisma.grade.upsert({
          where: { id: `grade-${gradeId}` },
          update: {},
          create: {
            id: `grade-${gradeId}`,
            studentId: student.profile.id,
            subjectId: classSubjects[s].subjectId,
            termId: term1.id,
            type: gradeTypes[g],
            title: `${classSubjects[s].subject.name} - ${gradeTypes[g]} ${g + 1}`,
            maxScore: 100,
            score,
            weight: gradeTypes[g] === GradeType.MIDTERM ? 2 : 1,
            date: daysAgo(randInt(5, 60)),
            gradedBy: teachers[s % teachers.length].user.id,
            feedback: score > 90 ? 'Excellent work!' : score > 75 ? 'Good effort, keep it up.' : 'Needs improvement, see me after class.',
          },
        });
      }
    }
  }
  console.log(`✅ ${gradeId} grades`);

  // ========== FEES ==========
  const feeConfigs = [
    { feeType: FeeType.TUITION, amount: 2500 },
    { feeType: FeeType.TRANSPORT, amount: 800 },
    { feeType: FeeType.BOOKS, amount: 500 },
    { feeType: FeeType.EXAM, amount: 300 },
    { feeType: FeeType.ACTIVITY, amount: 200 },
  ];
  let feeId = 0;
  let paymentId = 0;
  for (const student of students) {
    await prisma.feeAccount.upsert({
      where: { studentId: student.profile.id },
      update: {},
      create: { studentId: student.profile.id, balance: 0, totalPaid: 0 },
    });
    for (const [fi, cfg] of feeConfigs.entries()) {
      feeId++;
      const paid = Math.random() < 0.7;
      const status: FeeStatus = paid ? FeeStatus.PAID : Math.random() < 0.5 ? FeeStatus.PENDING : FeeStatus.OVERDUE;
      const fee = await prisma.fee.upsert({
        where: { id: `fee-${feeId}` },
        update: {},
        create: {
          id: `fee-${feeId}`,
          studentId: student.profile.id,
          feeType: cfg.feeType,
          academicYearId: academicYear.id,
          termId: fi % 2 === 0 ? term1.id : term2.id,
          amount: cfg.amount,
          dueDate: daysAhead(10 + fi * 15),
          description: `${cfg.feeType} fees for ${student.name}`,
          status,
        },
      });
      if (paid) {
        paymentId++;
        await prisma.payment.create({
          data: {
            feeId: fee.id,
            amount: cfg.amount,
            method: pick([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.UPI, PaymentMethod.BANK_TRANSFER, PaymentMethod.ONLINE]),
            transactionId: `TXN${String(paymentId).padStart(8, '0')}`,
            receiptNumber: `RCT-2024-${String(paymentId).padStart(5, '0')}`,
            paidAt: daysAgo(randInt(10, 90)),
            status: 'COMPLETED',
            recordedBy: admin.id,
          },
        });
      }
    }
    // Update account balance
    const fees = await prisma.fee.findMany({ where: { studentId: student.profile.id } });
    const paidTotal = await prisma.payment.aggregate({ where: { fee: { studentId: student.profile.id } }, _sum: { amount: true } });
    const total = fees.reduce((s, f) => s + Number(f.amount), 0);
    const paidAmt = Number(paidTotal._sum.amount ?? 0);
    await prisma.feeAccount.update({
      where: { studentId: student.profile.id },
      data: { balance: total - paidAmt, totalPaid: paidAmt },
    });
  }
  console.log(`✅ ${feeId} fees + ${paymentId} payments`);

  // ========== LIBRARY ==========
  for (const [bi, book] of LIBRARY_BOOKS.entries()) {
    const totalCopies = randInt(2, 8);
    await prisma.libraryBook.upsert({
      where: { id: `book-${bi + 1}` },
      update: {},
      create: {
        id: `book-${bi + 1}`,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        category: book.category,
        publisher: pick(['Penguin', 'HarperCollins', 'Oxford UP', 'Random House', 'Bloomsbury']),
        shelfNumber: `SHELF-${String(bi % 8 + 1).padStart(2, '0')}`,
        totalCopies,
        availableCopies: totalCopies,
        price: randInt(200, 1500),
        purchaseDate: new Date('2024-07-01'),
        status: BookStatus.AVAILABLE,
      },
    });
  }
  // Loans: ~40 active + some returned
  let loanId = 0;
  for (let i = 0; i < 40; i++) {
    const book = await prisma.libraryBook.findFirst({ skip: i % 20, orderBy: { id: 'asc' } });
    const student = students[i % students.length];
    if (!book) continue;
    loanId++;
    const returned = Math.random() < 0.5;
    const overdue = !returned && Math.random() < 0.2;
    await prisma.bookLoan.upsert({
      where: { id: `loan-${loanId}` },
      update: {},
      create: {
        id: `loan-${loanId}`,
        bookId: book.id,
        studentId: student.profile.id,
        issuedBy: admin.id,
        issuedAt: daysAgo(randInt(5, 40)),
        dueDate: daysAhead(randInt(0, 10)),
        returnedAt: returned ? daysAgo(randInt(1, 20)) : null,
        fineAmount: overdue ? randInt(10, 100) : 0,
        finePaid: false,
        status: returned ? 'RETURNED' : overdue ? 'OVERDUE' : 'ACTIVE',
        notes: null,
      },
    });
  }
  console.log('✅ 20 books + 40 loans');

  // ========== TRANSPORT ==========
  const routes = [
    { name: 'Route 1 - North Campus', startPoint: 'Hebbal', endPoint: 'School', stops: ['Hebbal', 'Yelahanka', 'Sahakar Nagar', 'RT Nagar'], fare: 800 },
    { name: 'Route 2 - South Campus', startPoint: 'Jayanagar', endPoint: 'School', stops: ['Jayanagar', 'Basavanagudi', 'Banashankari', 'JP Nagar'], fare: 900 },
    { name: 'Route 3 - East Campus', startPoint: 'Indiranagar', endPoint: 'School', stops: ['Indiranagar', 'Koramangala', 'HSR Layout', 'Bellandur'], fare: 1000 },
    { name: 'Route 4 - West Campus', startPoint: 'Rajajinagar', endPoint: 'School', stops: ['Rajajinagar', 'Malleshwaram', 'Vijayanagar', 'Magadi Road'], fare: 750 },
  ];
  for (const [ri, r] of routes.entries()) {
    await prisma.transportRoute.upsert({
      where: { id: `route-${ri + 1}` },
      update: {},
      create: {
        id: `route-${ri + 1}`,
        name: r.name,
        startPoint: r.startPoint,
        endPoint: r.endPoint,
        stops: r.stops,
        distanceKm: randInt(8, 20),
        fare: r.fare,
        status: RouteStatus.ACTIVE,
      },
    });
    await prisma.bus.upsert({
      where: { id: `bus-${ri + 1}` },
      update: {},
      create: {
        id: `bus-${ri + 1}`,
        busNumber: `BUS-${ri + 1}`,
        registrationNo: `KA-01-AB-${1000 + ri * 111}`,
        model: pick(['Ashok Leyland', 'Tata Starbus', 'Volvo B7R']),
        capacity: 40,
        driverName: pick(['Ramesh Kumar', 'Suresh Babu', 'Manjunath Gowda', 'Krishna Murthy']),
        driverPhone: `+91 9${randInt(100000000, 999999999)}`,
        helperName: pick(['Babu Rao', 'Venkatesh', 'Siddappa', 'Narayan']),
        routeId: `route-${ri + 1}`,
        status: BusStatus.ACTIVE,
      },
    });
  }
  for (let i = 0; i < 25; i++) {
    const student = students[i % students.length];
    const routeId = `route-${(i % 4) + 1}`;
    await prisma.transportAssignment.upsert({
      where: { id: `ta-${i + 1}` },
      update: {},
      create: {
        id: `ta-${i + 1}`,
        studentId: student.profile.id,
        routeId,
        busId: `bus-${(i % 4) + 1}`,
        stopName: pick(['Hebbal', 'Jayanagar', 'Indiranagar', 'Rajajinagar', 'Koramangala', 'Malleshwaram']),
        pickupTime: '07:30',
        dropTime: '15:45',
        status: 'ACTIVE',
        startDate: new Date('2024-09-01'),
        monthlyFee: 800,
      },
    });
  }
  console.log('✅ 4 routes, 4 buses, 25 transport assignments');

  // ========== EXAMS ==========
  let examId = 0;
  for (const cls of classes) {
    const classSubjects = await prisma.classSubject.findMany({ where: { classId: cls.id }, include: { subject: true } });
    for (let s = 0; s < 3; s++) {
      const cs = classSubjects[s % classSubjects.length];
      if (!cs) continue;
      examId++;
      const exam = await prisma.exam.upsert({
        where: { id: `exam-${examId}` },
        update: {},
        create: {
          id: `exam-${examId}`,
          name: `Midterm ${cs.subject.name}`,
          type: ExamType.MIDTERM,
          classId: cls.id,
          subjectId: cs.subjectId,
          termId: term1.id,
          date: daysAhead(randInt(2, 30)),
          startTime: '09:00',
          endTime: '11:00',
          maxMarks: 100,
          passingMarks: 40,
          roomNumber: cls.roomNumber,
          invigilatorId: teachers[s % teachers.length].profile.id,
          isPublished: false,
        },
      });
      // Results for each student in class
      const classStudents = await prisma.enrollment.findMany({ where: { classId: cls.id }, include: { student: true } });
      for (const en of classStudents) {
        const marks = randInt(35, 98);
        const grade = marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : marks >= 50 ? 'C' : marks >= 40 ? 'D' : 'F';
        await prisma.examResult.upsert({
          where: { id: `examres-${examId}-${en.studentId}` },
          update: {},
          create: {
            id: `examres-${examId}-${en.studentId}`,
            examId: exam.id,
            studentId: en.studentId,
            marksObtained: marks,
            grade,
            recordedBy: teachers[s % teachers.length].user.id,
            isAbsent: false,
          },
        });
      }
    }
  }
  console.log(`✅ ${examId * 14} exam results (14 exams x students)`);

  // ========== EVENTS ==========
  const events = [
    { id: 'evt-1', title: 'Annual Science Fair', type: EventType.ACADEMIC, startDate: daysAhead(3).toISOString().slice(0, 10) + 'T09:00:00Z', endDate: new Date().toISOString().slice(0, 10) + 'T17:00:00Z', location: 'Main Auditorium', isPublic: true },
    { id: 'evt-2', title: 'Sports Day', type: EventType.SPORTS, startDate: new Date().toISOString().slice(0, 10) + 'T08:00:00Z', endDate: new Date().toISOString().slice(0, 10) + 'T16:00:00Z', location: 'Sports Ground', isPublic: true },
    { id: 'evt-3', title: 'Annual Day Cultural Program', type: EventType.CULTURAL, startDate: new Date().toISOString().slice(0, 10) + 'T17:00:00Z', endDate: new Date().toISOString().slice(0, 10) + 'T21:00:00Z', location: 'Main Auditorium', isPublic: true },
    { id: 'evt-4', title: 'Parent-Teacher Meeting', type: EventType.MEETING, startDate: new Date().toISOString().slice(0, 10) + 'T10:00:00Z', endDate: new Date().toISOString().slice(0, 10) + 'T14:00:00Z', location: 'Conference Hall', isPublic: false },
    { id: 'evt-5', title: 'Inter-Class Football Tournament', type: EventType.SPORTS, startDate: new Date().toISOString().slice(0, 10) + 'T08:00:00Z', endDate: new Date().toISOString().slice(0, 10) + 'T16:00:00Z', location: 'Football Ground', isPublic: true },
    { id: 'evt-6', title: 'Computer Science Week', type: EventType.ACADEMIC, startDate: new Date().toISOString().slice(0, 10) + 'T09:00:00Z', endDate: new Date().toISOString().slice(0, 10) + 'T16:00:00Z', location: 'Computer Lab', isPublic: false },
  ];
  for (const e of events) {
    await prisma.schoolEvent.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        title: e.title,
        description: `${e.title} - all students are welcome to participate.`,
        type: e.type,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
        allDay: false,
        location: e.location,
        isPublic: e.isPublic,
        academicYearId: academicYear.id,
        createdBy: admin.id,
      },
    });
  }
  console.log('✅ 6 events');

  // ========== ANNOUNCEMENTS / NOTIFICATIONS ==========
  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length];
    const parent = await prisma.parentStudentLink.findFirst({ where: { studentId: student.profile.id }, include: { parent: true } });
    if (!parent) continue;
    await prisma.notification.create({
      data: {
        userId: parent.parent.userId,
        type: NotificationType.ATTENDANCE_ALERT,
        title: 'Attendance Alert',
        message: `${student.name} was absent on ${pick(['Oct 15', 'Oct 22', 'Nov 1', 'Nov 8'])}. Please check in with the class teacher.`,
        channels: ['IN_APP'],
        priority: 'HIGH',
      },
    });
  }
  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: NotificationType.ANNOUNCEMENT,
      title: 'School Closed - Nov 28',
      message: 'The school will remain closed on November 28th for Deepavali.',
      channels: ['IN_APP', 'EMAIL'],
      priority: 'URGENT',
    },
  });
  console.log('✅ 11 notifications');

  // ========== HR / PAYROLL ==========
  const staffRecords = await prisma.staffRecord.findMany();
  const nowMonth = new Date().getMonth() + 1;
  const prevMonth = nowMonth === 1 ? 12 : nowMonth - 1;
  const payMonths = [prevMonth, nowMonth];
  for (const sr of staffRecords) {
    for (const [mi, mo] of payMonths.entries()) {
      const basic = Number(sr.basicSalary);
      const allow = Number(sr.allowances);
      const ded = Number(sr.deductions);
      await prisma.payrollRecord.upsert({
        where: { id: `pay-${sr.id.slice(0, 8)}-${mi}` },
        update: {},
        create: {
          id: `pay-${sr.id.slice(0, 8)}-${mi}`,
          staffId: sr.id,
          month: mo,
          year: new Date().getFullYear(),
          basicPay: basic,
          allowances: allow,
          deductions: ded,
          bonus: mi === 0 ? randInt(0, 5000) : 0,
          netPay: basic + allow - ded + (mi === 0 ? randInt(0, 5000) : 0),
          status: PayrollStatus.COMPLETED,
          paidAt: daysAgo(mo === nowMonth ? 8 : 35),
          method: PaymentMethod.BANK_TRANSFER,
        },
      });
    }
  }
  // Leave requests
  for (let i = 0; i < 6; i++) {
    const sr = staffRecords[i + 1];
    if (!sr) continue;
    const approved = Math.random() < 0.8;
    await prisma.leaveRequest.create({
      data: {
        staffId: sr.id,
        type: pick([LeaveType.SICK, LeaveType.CASUAL, LeaveType.ANNUAL, LeaveType.EMERGENCY]),
        fromDate: daysAhead(randInt(3, 25)),
        toDate: daysAhead(randInt(4, 26)),
        reason: 'Personal work',
        status: approved ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
        approvedBy: approved ? admin.id : null,
        decisionNotes: approved ? 'Approved' : null,
        decidedAt: approved ? new Date() : null,
      },
    });
  }
  console.log('✅ Payroll for 13 staff + leave requests');

  // ========== ADMISSIONS ==========
  const apps = [
    { f: 'Rohan', l: 'Kulkarni', grade: 8, guardian: 'Prakash Kulkarni', status: AdmissionStatus.SUBMITTED },
    { f: 'Meghna', l: 'Reddy', grade: 6, guardian: 'Srinivas Reddy', status: AdmissionStatus.UNDER_REVIEW },
    { f: 'Arnav', l: 'Singh', grade: 9, guardian: 'Ajay Singh', status: AdmissionStatus.INTERVIEW_SCHEDULED },
    { f: 'Tanvi', l: 'Joshi', grade: 7, guardian: 'Nitin Joshi', status: AdmissionStatus.ACCEPTED },
    { f: 'Kabir', l: 'Bose', grade: 10, guardian: 'Deb Bose', status: AdmissionStatus.WAITLISTED },
    { f: 'Sana', l: 'Khan', grade: 6, guardian: 'Imran Khan', status: AdmissionStatus.REJECTED },
    { f: 'Yuvan', l: 'Patel', grade: 11, guardian: 'Hitesh Patel', status: AdmissionStatus.SUBMITTED },
    { f: 'Aadhya', l: 'Iyer', grade: 5, guardian: 'Karthik Iyer', status: AdmissionStatus.UNDER_REVIEW },
  ];
  for (const [ai, a] of apps.entries()) {
    await prisma.admissionApplication.upsert({
      where: { id: `app-${ai + 1}` },
      update: {},
      create: {
        id: `app-${ai + 1}`,
        applicationNumber: `APP-2024-${String(ai + 1).padStart(4, '0')}`,
        firstName: a.f,
        lastName: a.l,
        dateOfBirth: new Date(`2014-0${randInt(1, 9)}-15`),
        gender: pick(GENDERS),
        bloodGroup: pick(BLOOD_GROUPS),
        gradeApplying: a.grade,
        status: a.status,
        guardianName: a.guardian,
        guardianPhone: `+91 9${randInt(100000000, 999999999)}`,
        guardianEmail: `${a.f.toLowerCase()}${a.l.toLowerCase()}@gmail.com`,
        relationship: 'Father',
        address: `${randInt(1, 999)} ${pick(['MG Road', 'Park Street'])} , Bengaluru`,
        previousSchool: pick(['St. Mary\'s School', 'National Public School', 'Delhi Public School', 'Kendriya Vidyalaya']),
        previousClass: `Grade ${a.grade - 1}`,
        remarks: null,
        createdBy: admin.id,
      },
    });
  }
  console.log('✅ 8 admission applications');

  // ========== MESSAGES ==========
  for (let i = 0; i < 5; i++) {
    const student = students[i % students.length];
    const parent = await prisma.parentStudentLink.findFirst({ where: { studentId: student.profile.id }, include: { parent: true } });
    if (!parent) continue;
    await prisma.message.create({
      data: {
        senderId: teachers[i % teachers.length].user.id,
        receiverId: parent.parent.userId,
        subject: `Regarding ${student.name}'s progress`,
        content: `Dear parent, ${student.name} is doing well in class. However, I'd like to discuss their homework consistency in ${SUBJECT_NAMES[i % SUBJECT_NAMES.length].name}.`,
        conversationId: `conv-${teachers[i % teachers.length].user.id.slice(0, 6)}-${parent.parent.userId.slice(0, 6)}`,
      },
    });
    await prisma.message.create({
      data: {
        senderId: parent.parent.userId,
        receiverId: teachers[i % teachers.length].user.id,
        subject: `Re: Regarding ${student.name}'s progress`,
        content: 'Thank you for the update. We will ensure homework is completed daily. Please let us know if there is anything else we can do.',
        conversationId: `conv-${teachers[i % teachers.length].user.id.slice(0, 6)}-${parent.parent.userId.slice(0, 6)}`,
      },
    });
  }
  console.log('✅ 10 messages (5 conversations)');

  // ========== ROOMS & BOOKINGS ==========
  const rooms = [
    { name: 'Room 101', type: 'CLASSROOM', capacity: 30, location: 'Block A - Ground Floor', equipment: 'Whiteboard, Projector' },
    { name: 'Room 102', type: 'CLASSROOM', capacity: 30, location: 'Block A - Ground Floor', equipment: 'Whiteboard' },
    { name: 'Computer Lab 1', type: 'COMPUTER_LAB', capacity: 40, location: 'Block B - 1st Floor', equipment: '40 Workstations, Projector' },
    { name: 'Physics Lab', type: 'LABORATORY', capacity: 25, location: 'Block B - 1st Floor', equipment: 'Physics apparatus' },
    { name: 'Chemistry Lab', type: 'LABORATORY', capacity: 25, location: 'Block B - 1st Floor', equipment: 'Chemistry apparatus' },
    { name: 'Biology Lab', type: 'LABORATORY', capacity: 25, location: 'Block B - 1st Floor', equipment: 'Microscopes, Models' },
    { name: 'Main Auditorium', type: 'AUDITORIUM', capacity: 300, location: 'Block C - Ground Floor', equipment: 'Stage, Sound System, Projector' },
    { name: 'School Hall', type: 'HALL', capacity: 150, location: 'Block C - 1st Floor', equipment: 'Sound System' },
    { name: 'Gymnasium', type: 'GYMNASIUM', capacity: 80, location: 'Sports Complex', equipment: 'Gym equipment' },
    { name: 'Meeting Room', type: 'MEETING_ROOM', capacity: 12, location: 'Admin Block - 2nd Floor', equipment: 'TV Screen, Whiteboard' },
    { name: 'Library Reading Hall', type: 'LIBRARY', capacity: 60, location: 'Block D - Ground Floor', equipment: 'Reading tables' },
    { name: 'Multipurpose Room', type: 'OTHER', capacity: 50, location: 'Block D - 1st Floor', equipment: 'Moveable seating' },
  ];

  const createdRooms: { id: string; name: string }[] = [];
  for (const room of rooms) {
    const created = await prisma.room.upsert({
      where: { id: `room-${room.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}` },
      update: {},
      create: {
        id: `room-${room.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
        ...room,
      },
    });
    createdRooms.push(created);
  }
  console.log('✅ 12 rooms');

  const now = new Date();
  const teacher1 = teachers[0].user;
  for (let i = 0; i < 6; i++) {
    const room = createdRooms[i % createdRooms.length];
    const start = new Date(now.getTime() + (i + 1) * 86400000);
    start.setHours(9 + (i % 3), 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 3600000);
    await prisma.roomBooking.create({
      data: {
        roomId: room.id,
        userId: teacher1.id,
        title: pick(['Parent-Teacher Meeting', 'Staff Training', 'Science Exhibition Setup', 'Inter-House Debate', 'PTA Meeting', 'Faculty Workshop']),
        purpose: 'Scheduled school activity',
        startTime: start,
        endTime: end,
        attendees: 10 + i * 5,
        status: i % 3 === 0 ? 'PENDING' : i % 3 === 1 ? 'APPROVED' : 'COMPLETED',
      },
    });
    if (i % 3 === 1) {
      await prisma.room.update({ where: { id: room.id }, data: { status: 'IN_USE' } });
    }
  }
  console.log('✅ 6 room bookings');

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('Demo logins (password Admin@123):');
  console.log('  admin@educore.dev   - Principal');
  console.log('  teacher1@educore.dev - Teacher');
  console.log('  student1@educore.dev - Student');
  console.log('  parent1@educore.dev  - Parent');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

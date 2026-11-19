import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data in correct order
  await prisma.manualAccessLog.deleteMany({});
  await prisma.entitlement.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.price.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Users
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const studentPassword = await bcrypt.hash("Student@123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@edstore.com",
      passwordHash: adminPassword,
      name: "Admin Instructor",
      role: "ADMIN",
      phone: "9876543210",
    },
  });

  const student = await prisma.user.create({
    data: {
      email: "student@edstore.com",
      passwordHash: studentPassword,
      name: "Rahul Sharma",
      role: "STUDENT",
      phone: "9123456780",
    },
  });

  console.log(`👤 Users seeded: Admin (${admin.email}), Student (${student.email})`);

  // 2. Seed Board
  const board = await prisma.board.create({
    data: {
      name: "CBSE",
      slug: "cbse",
      description: "Central Board of Secondary Education curriculum with high quality notes and quizzes.",
    },
  });

  // 3. Seed Classes
  const class10 = await prisma.class.create({
    data: {
      boardId: board.id,
      name: "Class 10",
      slug: "class-10",
      gradeNumber: 10,
    },
  });

  const class12 = await prisma.class.create({
    data: {
      boardId: board.id,
      name: "Class 12",
      slug: "class-12",
      gradeNumber: 12,
    },
  });

  const classes = [class10, class12];

  // Pass products for each class (Monthly ₹299, Annual ₹2499)
  for (const cls of classes) {
    const monthlyPass = await prisma.product.create({
      data: {
        type: "MONTHLY_PASS",
        title: `${cls.name} All-Access Monthly Pass`,
        description: `Full access to all subjects, chapters, notes, and study material for ${cls.name} for 30 days.`,
        accessLengthDays: 30,
        classId: cls.id,
      },
    });
    await prisma.price.create({
      data: {
        productId: monthlyPass.id,
        amountPaise: 29900, // ₹299
      },
    });

    const annualPass = await prisma.product.create({
      data: {
        type: "ANNUAL_PASS",
        title: `${cls.name} All-Access Annual Pass`,
        description: `Unrestricted 365 days access to every subject, notes, revision material and future updates for ${cls.name}.`,
        accessLengthDays: 365,
        classId: cls.id,
      },
    });
    await prisma.price.create({
      data: {
        productId: annualPass.id,
        amountPaise: 249900, // ₹2,499
      },
    });
  }

  // 4. Subjects & Chapters Data
  const catalogueData = [
    {
      class: class10,
      subjects: [
        {
          name: "Mathematics",
          slug: "mathematics-10",
          icon: "calculator",
          chapters: [
            { name: "Real Numbers", slug: "real-numbers", isFree: true },
            { name: "Polynomials", slug: "polynomials", isFree: false },
            { name: "Pair of Linear Equations in Two Variables", slug: "linear-equations", isFree: false },
            { name: "Quadratic Equations", slug: "quadratic-equations", isFree: false },
            { name: "Arithmetic Progressions", slug: "arithmetic-progressions", isFree: false },
          ],
        },
        {
          name: "Science",
          slug: "science-10",
          icon: "flask",
          chapters: [
            { name: "Chemical Reactions and Equations", slug: "chemical-reactions", isFree: true },
            { name: "Acids, Bases and Salts", slug: "acids-bases-salts", isFree: false },
            { name: "Metals and Non-metals", slug: "metals-non-metals", isFree: false },
            { name: "Life Processes", slug: "life-processes", isFree: false },
            { name: "Control and Coordination", slug: "control-coordination", isFree: false },
          ],
        },
        {
          name: "Social Science",
          slug: "social-science-10",
          icon: "globe",
          chapters: [
            { name: "The Rise of Nationalism in Europe", slug: "nationalism-europe", isFree: true },
            { name: "Nationalism in India", slug: "nationalism-india", isFree: false },
            { name: "Resources and Development", slug: "resources-development", isFree: false },
            { name: "Power Sharing", slug: "power-sharing", isFree: false },
            { name: "Development (Economics)", slug: "development-econ", isFree: false },
          ],
        },
      ],
    },
    {
      class: class12,
      subjects: [
        {
          name: "Physics",
          slug: "physics-12",
          icon: "atom",
          chapters: [
            { name: "Electric Charges and Fields", slug: "electric-charges-fields", isFree: true },
            { name: "Electrostatic Potential and Capacitance", slug: "electrostatic-potential", isFree: false },
            { name: "Current Electricity", slug: "current-electricity", isFree: false },
            { name: "Moving Charges and Magnetism", slug: "moving-charges-magnetism", isFree: false },
            { name: "Magnetism and Matter", slug: "magnetism-matter", isFree: false },
          ],
        },
        {
          name: "Chemistry",
          slug: "chemistry-12",
          icon: "flame",
          chapters: [
            { name: "Solutions", slug: "solutions", isFree: true },
            { name: "Electrochemistry", slug: "electrochemistry", isFree: false },
            { name: "Chemical Kinetics", slug: "chemical-kinetics", isFree: false },
            { name: "The d- and f-Block Elements", slug: "d-f-block-elements", isFree: false },
            { name: "Coordination Compounds", slug: "coordination-compounds", isFree: false },
          ],
        },
        {
          name: "Mathematics",
          slug: "mathematics-12",
          icon: "sigma",
          chapters: [
            { name: "Relations and Functions", slug: "relations-functions", isFree: true },
            { name: "Inverse Trigonometric Functions", slug: "inverse-trig-functions", isFree: false },
            { name: "Matrices and Determinants", slug: "matrices-determinants", isFree: false },
            { name: "Continuity and Differentiability", slug: "continuity-differentiability", isFree: false },
            { name: "Application of Derivatives", slug: "application-derivatives", isFree: false },
          ],
        },
      ],
    },
  ];

  const class12SubjectIds: string[] = [];

  for (const cData of catalogueData) {
    for (const sData of cData.subjects) {
      const subject = await prisma.subject.create({
        data: {
          classId: cData.class.id,
          name: sData.name,
          slug: sData.slug,
          icon: sData.icon,
        },
      });

      if (cData.class.slug === "class-12") {
        class12SubjectIds.push(subject.id);
      }

      // Subject Pack Product (Lifetime ₹499)
      const subjectPack = await prisma.product.create({
        data: {
          type: "SUBJECT_PACK",
          title: `${cData.class.name} ${subject.name} Complete Subject Pack`,
          description: `Every chapter in ${subject.name}, including all current notes and all chapters added later. Lifetime access.`,
          accessLengthDays: null,
          subjectId: subject.id,
          classId: cData.class.id,
        },
      });
      await prisma.price.create({
        data: {
          productId: subjectPack.id,
          amountPaise: 49900, // ₹499
        },
      });

      // Seed 5 Chapters
      let chNum = 1;
      for (const chData of sData.chapters) {
        const chapter = await prisma.chapter.create({
          data: {
            subjectId: subject.id,
            name: chData.name,
            slug: chData.slug,
            chapterNumber: chNum,
            isFree: chData.isFree,
          },
        });

        // Add study material to chapter
        await prisma.material.create({
          data: {
            chapterId: chapter.id,
            title: `${chData.name} - Comprehensive Revision Notes & Formula Sheet`,
            type: "PDF",
            content: `# ${chData.name} - High-Yield Study Notes\n\n## 1. Overview & Core Concepts\nThis chapter covers the foundational principles of **${chData.name}** for **${cData.class.name} ${subject.name}**.\n\n### Key Highlights:\n- Rigorous conceptual breakdowns and step-by-step derivations.\n- Solved exemplar problems and common pitfalls in board examinations.\n- High-weightage formulas and quick-revision cheat sheet.\n\n## 2. Theoretical Breakdown\nUnderstanding the fundamental laws and real-world applications provides an edge in objective and subjective questions alike.\n\n### Important Formulas & Definitions:\n1. Standard Definition: A rigorous and precise mathematical treatment.\n2. Fundamental Theorem: Validated through experimental observation and empirical data.\n3. Problem-solving strategy: Identify given parameters, establish governing equations, and verify units.\n\n## 3. Practice Exercises\nReview the end-of-chapter practice quiz and previous 10-year question bank to test mastery!`,
            sizeBytes: 1024 * 1024 * 2, // 2 MB
          },
        });

        // Chapter Notes Product (Lifetime ₹49)
        const chapterProduct = await prisma.product.create({
          data: {
            type: "CHAPTER_NOTES",
            title: `Chapter ${chNum}: ${chData.name} Notes`,
            description: `Complete study notes, PDF guide, and practice materials for ${chData.name}. Lifetime access.`,
            accessLengthDays: null,
            chapterId: chapter.id,
            subjectId: subject.id,
            classId: cData.class.id,
          },
        });
        await prisma.price.create({
          data: {
            productId: chapterProduct.id,
            amountPaise: 4900, // ₹49
          },
        });

        chNum++;
      }
    }
  }

  // 5. Seed Bundle
  const stemBundle = await prisma.product.create({
    data: {
      type: "BUNDLE",
      title: "Class 12 STEM All-Subject Mega Bundle",
      description: "Hand-picked bundle including Physics, Chemistry, and Mathematics subject packs with lifetime access at a special discounted price.",
      accessLengthDays: null,
      classId: class12.id,
      bundleItemIds: JSON.stringify(class12SubjectIds),
    },
  });
  await prisma.price.create({
    data: {
      productId: stemBundle.id,
      amountPaise: 119900, // ₹1,199 (Regular 3 * 499 = 1497)
    },
  });

  // 6. Seed Coupons
  await prisma.coupon.create({
    data: {
      code: "WELCOME50",
      discountType: "FLAT",
      discountValue: 5000, // ₹50 in paise
      minOrderPaise: 9900, // ₹99
      maxUses: 200,
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "EDTECH20",
      discountType: "PERCENTAGE",
      discountValue: 20, // 20%
      maxDiscountPaise: 20000, // ₹200 max discount
      minOrderPaise: 15000, // ₹150
      maxUses: 500,
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "PASS500",
      discountType: "FLAT",
      discountValue: 50000, // ₹500 in paise
      minOrderPaise: 200000, // ₹2,000
      maxUses: 100,
      isActive: true,
    },
  });

  console.log("✅ Seeding completed successfully!");
  console.log("📊 Summary:");
  console.log("   - 1 Board: CBSE");
  console.log("   - 2 Classes: Class 10 & Class 12");
  console.log("   - 6 Subjects (3 per class)");
  console.log("   - 30 Chapters (5 per subject, with 1 Free Sample per subject)");
  console.log("   - Products for all Chapters (₹49), Subjects (₹499), Monthly Pass (₹299), Annual Pass (₹2499), and STEM Bundle (₹1199)");
  console.log("   - 3 Active Discount Coupons: WELCOME50, EDTECH20, PASS500");
  console.log("   - Credentials: Admin (admin@edstore.com / Admin@123), Student (student@edstore.com / Student@123)");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

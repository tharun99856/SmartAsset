import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Pick up DATABASE_URL from .env when running locally (Vercel/CI inject it).
try {
  process.loadEnvFile();
} catch {
  // no .env file — rely on the environment
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env (see .env.example) and retry.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Midnight `n` days from today (negative = past).
function day(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding the cultural council inventory…");

  // Wipe in dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.assetTransaction.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // ---------- Users ----------
  const adminHash = await bcrypt.hash("admin123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  // Demo IDs for evaluation — referenced on the login page and in the README.
  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin_r@ee.iitr.ac.in", passwordHash: adminHash, role: "admin" },
  });

  const [student1, student2, student3, student4, student5] = await Promise.all([
    prisma.user.create({ data: { name: "Student 1", email: "student_t@ee.iitr.ac.in", passwordHash: studentHash, role: "user" } }),
    prisma.user.create({ data: { name: "Student 2", email: "student_2@ee.iitr.ac.in", passwordHash: studentHash, role: "user" } }),
    prisma.user.create({ data: { name: "Student 3", email: "student_3@ee.iitr.ac.in", passwordHash: studentHash, role: "user" } }),
    prisma.user.create({ data: { name: "Student 4", email: "student_4@ee.iitr.ac.in", passwordHash: studentHash, role: "user" } }),
    prisma.user.create({ data: { name: "Student 5", email: "student_5@ee.iitr.ac.in", passwordHash: studentHash, role: "user" } }),
  ]);

  console.log("Users ready — admin_r@ee.iitr.ac.in / admin123, student_t@ee.iitr.ac.in / student123");

  // ---------- Categories ----------
  const categoryDefs = [
    ["Cameras & Optics", "Bodies, lenses, gimbals and supports for the media cell"],
    ["Audio", "Microphones, mixers, speakers and recording kit"],
    ["Lighting", "Stage washes, moving heads, studio LEDs and effects"],
    ["Stage & Backdrop", "Truss, risers, drapes and crowd management"],
    ["Instruments", "Shared instruments for performances and practice"],
    ["Projection & Display", "Projectors, screens, LED wall and displays"],
    ["Power & Cabling", "Distribution boxes, signal and power cabling"],
    ["Logistics", "Cases, comms, furniture and event-day essentials"],
  ];

  const cats = {};
  for (const [name, description] of categoryDefs) {
    cats[name] = await prisma.category.create({ data: { name, description } });
  }

  console.log(`${categoryDefs.length} categories created.`);

  // ---------- Assets (56 items) ----------
  const A = (name, cat, totalQuantity, description, status = "Available") => ({
    name, categoryId: cats[cat].id, totalQuantity, description, status,
  });

  const assetDefs = [
    // Cameras & Optics
    A("Sony Alpha A7 III", "Cameras & Optics", 5, "Full-frame mirrorless body, 24.2 MP, dual SD slots. Battery and strap included."),
    A("Canon EOS 5D Mark IV", "Cameras & Optics", 3, "Workhorse DSLR for event coverage. 30.4 MP, 4K video."),
    A("Canon EOS R6", "Cameras & Optics", 2, "Mirrorless body with stellar autofocus for low-light stage shots."),
    A("Nikon Z6 II", "Cameras & Optics", 2, "All-rounder mirrorless body, great dynamic range."),
    A("GoPro Hero 12", "Cameras & Optics", 6, "Action cam for crowd timelapses and BTS reels. Mounts in the accessories pouch."),
    A("DJI Mini 4 Pro drone", "Cameras & Optics", 1, "Sub-250g drone. Flying requires prior security clearance — book early."),
    A("Sigma 24-70mm f/2.8 lens", "Cameras & Optics", 3, "E-mount standard zoom, the default event lens."),
    A("Canon 70-200mm f/2.8 lens", "Cameras & Optics", 2, "Telephoto for stage close-ups from the sound desk."),
    A("DJI Ronin-S gimbal", "Cameras & Optics", 2, "3-axis stabiliser for DSLR/mirrorless. Calibrate before handover."),
    A("Manfrotto tripod", "Cameras & Optics", 10, "Aluminium 3-section legs with fluid pan head."),
    // Audio
    A("Shure SM58 vocal mic", "Audio", 12, "The indestructible stage vocal mic. XLR, no battery needed."),
    A("Shure SM7B studio mic", "Audio", 4, "Broadcast-grade dynamic mic for podcast and VO recordings."),
    A("Rode Wireless GO II", "Audio", 6, "Dual-channel clip-on wireless kit, charges over USB-C."),
    A("Sennheiser EW100 lapel kit", "Audio", 4, "UHF lavalier system for anchors and speakers."),
    A("Zoom H6 field recorder", "Audio", 3, "Six-track portable recorder with interchangeable capsules."),
    A("Behringer X32 mixing console", "Audio", 1, "32-channel digital desk. Only issued with a trained sound op.", "Available"),
    A("Yamaha MG16XU mixer", "Audio", 2, "16-channel analog mixer with USB interface, ideal for mid-size venues."),
    A("JBL EON615 powered speaker", "Audio", 4, "1000W active 15\" speaker, pole-mountable."),
    A("QSC K12.2 stage monitor", "Audio", 4, "2000W active wedge for on-stage foldback."),
    A("Audio-Technica ATH-M50x", "Audio", 6, "Closed-back monitoring headphones for the recording room."),
    A("Boya boom mic kit", "Audio", 3, "Shotgun mic with boom pole, shock mount and deadcat."),
    // Lighting
    A("Aputure 120D II LED", "Lighting", 4, "180W daylight COB with Bowens mount. Softbox sold separately — see Softbox kit."),
    A("Godox SL-60W LED", "Lighting", 6, "Budget continuous light for interviews and green rooms."),
    A("Nanlite Pavotube II", "Lighting", 8, "RGB tube light, battery powered. Great for stage accents."),
    A("PAR LED stage light", "Lighting", 24, "RGBW par can, DMX controllable. The bread and butter of every prod night."),
    A("Moving-head beam light", "Lighting", 8, "230W beam mover. Needs the DMX controller and a rigging check."),
    A("Followspot 575W", "Lighting", 2, "Manual followspot for lead performers. Operator chair included, enthusiasm not."),
    A("Softbox kit", "Lighting", 5, "90cm Bowens-mount softbox with grid and diffusers."),
    A("Heavy-duty light stand", "Lighting", 16, "Air-cushioned steel stand, supports up to 10 kg."),
    A("Fog machine 1500W", "Lighting", 3, "DMX fog machine. Fluid bottle must be returned with at least a third left."),
    A("DMX-512 controller", "Lighting", 2, "192-channel lighting desk for pars and movers."),
    // Stage & Backdrop
    A("Truss section 2m", "Stage & Backdrop", 12, "Aluminium box truss, 290mm. Clamps live in the rigging crate."),
    A("Stage riser 4×4 ft", "Stage & Backdrop", 10, "Modular platform, 40cm height. Two people minimum to carry."),
    A("Black masking drape 9×12", "Stage & Backdrop", 8, "Flame-retardant wool serge with tie lines."),
    A("White cyclorama backdrop", "Stage & Backdrop", 2, "Seamless cyc cloth for dance and projection acts."),
    A("Acrylic podium", "Stage & Backdrop", 2, "Clear lectern with cable pass-through and reading light."),
    A("Crowd barricade section", "Stage & Backdrop", 20, "Interlocking mojo barrier, 1.2m per section."),
    // Instruments
    A("Yamaha P-125 digital piano", "Instruments", 1, "88 weighted keys, sustain pedal and X-stand in the bag."),
    A("Cajón", "Instruments", 3, "Snare-wired cajón for unplugged sets."),
    A("Yamaha F310 acoustic guitar", "Instruments", 4, "Dreadnought acoustic, fresh strings each semester."),
    A("Tabla pair", "Instruments", 3, "Professional sheesham tabla set with tuning hammer and cushions."),
    A("Dhol", "Instruments", 4, "Full-size dhol with straps and sticks. Handle the skins with care."),
    A("Crash cymbal set", "Instruments", 2, "16\" and 18\" crash pair with stands."),
    // Projection & Display
    A("Epson EB-2155W projector", "Projection & Display", 3, "5000 lumen WXGA, fine for lit rooms and seminar halls."),
    A("BenQ 4K projector", "Projection & Display", 1, "Home-cinema grade 4K unit for film screenings only."),
    A("Projection screen 120\"", "Projection & Display", 3, "Tripod front-projection screen, 16:9."),
    A("LED video wall panel (P3)", "Projection & Display", 24, "500×500mm indoor cabinet. Issued per panel — plan your grid first."),
    A("55\" LCD TV on stand", "Projection & Display", 4, "Display with rolling trolley for registration desks and scoreboards."),
    // Power & Cabling
    A("32A power distribution box", "Power & Cabling", 4, "RCBO-protected distro with 16A and 6A outlets."),
    A("XLR cable 10m", "Power & Cabling", 30, "Balanced audio cable. Coil it over-under or the sound op will find you."),
    A("Extension reel 25m", "Power & Cabling", 10, "16A weatherproof cable reel with surge protection."),
    A("DMX cable pack (5 pcs)", "Power & Cabling", 6, "5-pin DMX runs in assorted lengths, taped and tested."),
    // Logistics
    A("Walkie-talkie set (8 pcs)", "Logistics", 5, "License-free handsets with headsets, charged cradle included."),
    A("Flight case (large)", "Logistics", 6, "Wheeled 120L hard case with foam inserts."),
    A("Folding table 6ft", "Logistics", 12, "Plastic trestle table for desks, stalls and green rooms."),
    A("Pop-up canopy 10×10", "Logistics", 4, "Quick-pitch gazebo with sandbag weights."),
  ];

  const assets = {};
  for (const def of assetDefs) {
    const created = await prisma.asset.create({
      data: { ...def, availableQuantity: def.totalQuantity },
    });
    assets[def.name] = created;
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "CREATE_ASSET",
        entityType: "Asset",
        entityId: created.id,
        metadata: JSON.stringify({ name: created.name, totalQuantity: created.totalQuantity }),
        timestamp: day(-12),
      },
    });
  }

  console.log(`${assetDefs.length} assets registered.`);

  // ---------- Bookings ----------
  // qty of Approved / Issued / Overdue bookings is deducted from stock below,
  // so the dashboard, catalog and scan station all agree with each other.
  const bookingDefs = [
    // status, user, asset, qty, start, end, createdAt, extra
    ["Pending", student1, "Sony Alpha A7 III", 2, day(2), day(5), day(0)],
    ["Pending", student2, "Shure SM58 vocal mic", 4, day(1), day(3), day(-1)],
    ["Pending", student3, "Aputure 120D II LED", 1, day(3), day(6), day(0)],
    ["Approved", student4, "Canon EOS 5D Mark IV", 1, day(1), day(4), day(-2)],
    ["Approved", student5, "Epson EB-2155W projector", 1, day(0), day(2), day(-3)],
    ["Issued", student1, "Rode Wireless GO II", 2, day(-1), day(2), day(-4)],
    ["Issued", student2, "Manfrotto tripod", 3, day(-2), day(1), day(-5)],
    ["Overdue", student3, "JBL EON615 powered speaker", 1, day(-6), day(-2), day(-6)],
    ["Returned", student4, "DJI Ronin-S gimbal", 1, day(-10), day(-7), day(-10)],
    ["Returned", student1, "Yamaha MG16XU mixer", 1, day(-8), day(-5), day(-6)],
    ["Returned", student5, "Fog machine 1500W", 2, day(-5), day(-3), day(-5)],
    ["Rejected", student2, "LED video wall panel (P3)", 12, day(2), day(4), day(-1), {
      rejectionReason: "The wall is committed to the convocation stage that weekend — try the 55\" TVs instead.",
    }],
    ["Cancelled", student3, "DJI Mini 4 Pro drone", 1, day(5), day(7), day(-2)],
  ];

  const ACTIVE = ["Approved", "Issued", "Overdue"];
  const bookings = [];

  for (const [status, user, assetName, qty, start, end, createdAt, extra = {}] of bookingDefs) {
    const asset = assets[assetName];
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        assetId: asset.id,
        quantityRequested: qty,
        startDate: start,
        endDate: end,
        dueDate: end,
        status,
        createdAt,
        ...extra,
      },
    });
    bookings.push({ booking, user, asset, status, qty });

    if (ACTIVE.includes(status)) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { availableQuantity: { decrement: qty } },
      });
    }
  }

  console.log(`${bookingDefs.length} bookings created across the full lifecycle.`);

  // ---------- Transactions, notifications & audit history ----------
  for (const { booking, user, asset, status, qty } of bookings) {
    if (["Approved", "Issued", "Overdue", "Returned"].includes(status)) {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "APPROVE_BOOKING",
          entityType: "Booking",
          entityId: booking.id,
          metadata: JSON.stringify({ assetName: asset.name, quantity: qty }),
          timestamp: booking.createdAt,
        },
      });
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "booking_status",
          message: `Your booking for "${asset.name}" (×${qty}) was approved. Collect it from the equipment desk.`,
          isRead: status !== "Approved",
          createdAt: booking.createdAt,
        },
      });
    }

    if (["Issued", "Overdue", "Returned"].includes(status)) {
      await prisma.assetTransaction.create({
        data: { bookingId: booking.id, action: "issued", performedById: admin.id, notes: "Handed over at the equipment desk", timestamp: booking.startDate },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.id, action: "ISSUE_ASSET", entityType: "Booking", entityId: booking.id,
          metadata: JSON.stringify({ assetName: asset.name, quantity: qty }), timestamp: booking.startDate,
        },
      });
    }

    if (status === "Returned") {
      await prisma.assetTransaction.create({
        data: { bookingId: booking.id, action: "returned", performedById: admin.id, notes: "Checked in, condition OK", timestamp: booking.endDate },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.id, action: "RETURN_ASSET", entityType: "Booking", entityId: booking.id,
          metadata: JSON.stringify({ assetName: asset.name, quantity: qty }), timestamp: booking.endDate,
        },
      });
    }

    if (status === "Rejected") {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id, action: "REJECT_BOOKING", entityType: "Booking", entityId: booking.id,
          metadata: JSON.stringify({ assetName: asset.name, quantity: qty }), timestamp: booking.createdAt,
        },
      });
      await prisma.notification.create({
        data: {
          userId: user.id, type: "booking_status",
          message: `Your request for "${asset.name}" was declined: ${booking.rejectionReason}`,
          createdAt: booking.createdAt,
        },
      });
    }

    if (status === "Overdue") {
      await prisma.notification.create({
        data: {
          userId: user.id, type: "overdue",
          message: `"${asset.name}" was due back on ${booking.endDate.toDateString()}. Please return it today.`,
        },
      });
    }
  }

  console.log("Notifications, transactions and audit history in place.");
  console.log("");
  console.log("Done. Demo IDs:");
  console.log("  Admin   → admin_r@ee.iitr.ac.in / admin123");
  console.log("  Student → student_t@ee.iitr.ac.in / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const adminApp = !admin.apps.length 
  ? admin.initializeApp({
      projectId: firebaseConfig.projectId
    })
  : admin.app();

// Access the specific named database explicitly bound to the correct project
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
console.log(`Firebase Admin initialized for project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId}`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 1. Purchase Service (Boost, Video Unlock)
  app.post("/api/services/purchase", async (req, res) => {
    const { uid, serviceType, listingId, amount, duration } = req.body;

    if (!uid || !serviceType || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      console.log(`Starting purchase for user ${uid}, service: ${serviceType}, amount: ${amount}`);
      const userRef = db.collection("users").doc(uid);
      const isPendingListing = listingId === 'PENDING';
      const listingRef = (listingId && !isPendingListing) ? db.collection("listings").doc(listingId) : null;

      const result = await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error("User not found");
        }

        const userData = userDoc.data();
        const currentBalance = userData?.balance || 0;

        if (currentBalance < amount) {
          throw new Error("Solde insuffisant");
        }

        // Deduct balance
        transaction.update(userRef, {
          balance: FieldValue.increment(-amount),
          transactions: FieldValue.arrayUnion({
            id: `purchase_${Date.now()}`,
            type: "ACHAT_SERVICE",
            amount: amount,
            description: `${serviceType}${listingId ? ` (Annonce: ${listingId})` : ""}`,
            status: "completed",
            createdAt: Timestamp.now(),
          }),
        });

        // Update listing if applicable
        if (listingRef) {
          const listingDoc = await transaction.get(listingRef);
          if (listingDoc.exists) {
            if (serviceType.includes("BOOST")) {
              const boostExpiresAt = new Date();
              boostExpiresAt.setDate(boostExpiresAt.getDate() + (duration || 1));
              
              transaction.update(listingRef, {
                isBoosted: true,
                boostExpiresAt: Timestamp.fromDate(boostExpiresAt),
                updatedAt: Timestamp.now(),
              });
            } else if (serviceType.includes("Vidéo")) {
              transaction.update(listingRef, {
                hasVideoAccess: true,
                updatedAt: Timestamp.now(),
              });
            }
          } else {
            console.warn(`Listing document ${listingId} not found, skipping listing update but proceeding with payment.`);
          }
        }

        return { newBalance: currentBalance - amount };
      });

      res.json({ status: "success", ...result });
    } catch (error: any) {
      console.error("Purchase Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

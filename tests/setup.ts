import { config } from "dotenv";

config({ path: ".env" });

// Deterministic fallback so tests never depend on a real associate tag.
process.env.AMAZON_ASSOCIATE_TAG ||= "precocaindo-test-20";

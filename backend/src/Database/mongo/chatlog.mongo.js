import mongoose from 'mongoose';

/* Standalone collection — one row per assistant reply in the client chat
   widget. Captured to mine the most-asked questions for a future FAQ (the
   chatbot can be retired once the common questions are covered). Grows
   unbounded and is read independently of any User doc (admin analytics),
   so it lives on its own rather than embedded.

   `intent` records which tool the assistant used to answer, so the FAQ can
   be grouped without re-parsing free text:
     'documents'      → get_application_requirements (what do I need to apply)
     'recommendation' → recommend_companies
     'general'        → answered from the model's own knowledge, no tool */
const ChatLogSchema = new mongoose.Schema(
    {
        ChatLogID: { type: Number, index: true, unique: true },

        UserID:   { type: Number, required: true, index: true },
        Language: { type: String, enum: ['en', 'ar'], required: true },

        Question: { type: String, required: true, trim: true, maxlength: 2000 },
        Answer:   { type: String, required: true, trim: true, maxlength: 4000 },

        Intent: {
            type: String,
            enum: ['documents', 'recommendation', 'general'],
            required: true,
            index: true,
        },
        /* How many companies the recommend tool returned (0 for non-rec turns) —
           lets admins spot intents that came up empty. */
        RecommendationCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

/* Admin FAQ view scans newest-first, optionally filtered by intent. */
ChatLogSchema.index({ Intent: 1, _id: -1 });

export default mongoose.model('ChatLog', ChatLogSchema);

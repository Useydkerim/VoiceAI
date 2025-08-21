'use server';

import {auth} from "@clerk/nextjs/server";
import {createSupabaseClient} from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth();
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .insert({...formData, author })
        .select();

    if(error || !data) throw new Error(error?.message || 'Failed to create a companion');

    return data[0];
}

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const supabase = createSupabaseClient();

    let query = supabase.from('companions').select();

    if(subject && topic) {
        query = query.ilike('subject', `%${subject}%`)
            .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    } else if(subject) {
        query = query.ilike('subject', `%${subject}%`)
    } else if(topic) {
        query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: companions, error } = await query;

    if(error) throw new Error(error.message);

    // Get session data for these companions
    return await enrichCompanionsWithSessionData(companions || []);
}

export const enrichCompanionsWithSessionData = async (companions: any[]) => {
    let userId = null;
    try {
        const authResult = await auth();
        userId = authResult.userId;
    } catch (error) {
        console.log('Auth not available, using demo data for development');
        // Return companions with mock data for demo purposes when not authenticated
        return companions.map((companion, index) => ({
            ...companion,
            lastSessionDate: index % 3 === 0 ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toLocaleDateString() : null,
            lastSessionScore: index % 3 === 0 ? Math.floor(Math.random() * 40) + 60 : null,
            lastSessionSummary: index % 3 === 0 ? generateMockSummary(companion.subject, companion.topic) : null
        }));
    }
    
    const supabase = createSupabaseClient();
    
    if (!companions.length || !userId) {
        return companions.map(companion => ({
            ...companion,
            lastSessionDate: null,
            lastSessionScore: null,
            lastSessionSummary: null
        }));
    }

    const companionIds = companions.map(c => c.id);
    
    try {
        // Get latest session for each companion with evaluation data
        const { data: sessions, error } = await supabase
            .from('session_history')
            .select('companion_id, created_at, score, summary, duration, engagement_score, comprehension_score, participation_score')
            .eq('user_id', userId)
            .in('companion_id', companionIds)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching session data:', error);
            // Return companions without session data if database query fails
            return companions.map(companion => ({
                ...companion,
                lastSessionDate: null,
                lastSessionScore: null,
                lastSessionSummary: null
            }));
        }

        // Create a map of companion_id to latest session
        const sessionMap = new Map();
        sessions?.forEach(session => {
            if (!sessionMap.has(session.companion_id)) {
                sessionMap.set(session.companion_id, session);
            }
        });

        // Enrich companions with real session data
        return companions.map(companion => {
            const session = sessionMap.get(companion.id);
            return {
                ...companion,
                lastSessionDate: session ? new Date(session.created_at).toLocaleDateString() : null,
                lastSessionScore: session?.score || null,
                lastSessionSummary: session?.summary || null
            };
        });
    } catch (error) {
        console.error('Database error in enrichCompanionsWithSessionData:', error);
        // Return companions without session data if there's an error
        return companions.map(companion => ({
            ...companion,
            lastSessionDate: null,
            lastSessionScore: null,
            lastSessionSummary: null
        }));
    }
}

export const getCompanion = async (id: string) => {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('id', id);

    if(error) return console.log(error);

    return data[0];
}

export const addToSessionHistory = async (
    companionId: string, 
    vapiCallId?: string | null,
    evaluationData?: { 
        score: number; 
        summary: string;
        duration?: number;
        engagement_score?: number;
        comprehension_score?: number;
        participation_score?: number;
        insights?: string[];
    }
) => {
    let userId = null;
    try {
        const authResult = await auth();
        userId = authResult.userId;
    } catch (error) {
        console.log('Auth not available, logging session data:', { companionId, vapiCallId, evaluationData });
        return null; // Return early if no auth
    }
    
    const supabase = createSupabaseClient();
    
    if (!userId) {
        console.log('No user ID available');
        return null;
    }
    
    // Prepare full evaluation data
    let insertData: any = {
        companion_id: companionId,
        user_id: userId,
    };
    
    // Add VAPI call ID if available
    if (vapiCallId) {
        insertData.vapi_call_id = vapiCallId;
    }
    
    // Add all evaluation data if available
    if (evaluationData) {
        insertData = {
            ...insertData,
            score: evaluationData.score,
            summary: evaluationData.summary,
            duration: evaluationData.duration || null,
            engagement_score: evaluationData.engagement_score || null,
            comprehension_score: evaluationData.comprehension_score || null,
            participation_score: evaluationData.participation_score || null,
            insights: evaluationData.insights || null,
            evaluated_at: new Date().toISOString()
        };
    }
    
    try {
        const { data, error } = await supabase.from('session_history')
            .insert(insertData);
        
        if (error) {
            console.error('Error inserting session history:', error);
            // Try again with just basic data
            const { data: fallbackData, error: fallbackError } = await supabase.from('session_history')
                .insert({
                    companion_id: companionId,
                    user_id: userId,
                });
                
            if (fallbackError) {
                console.error('Fallback insert also failed:', fallbackError);
                throw new Error(fallbackError.message);
            }
            return fallbackData;
        }
        
        console.log('Session history saved successfully:', data);
        return data;
        
    } catch (error: any) {
        console.error('Session history save error:', error);
        throw error;
    }
}

export const getRecentSessions = async (limit = 10) => {
    let userId = null;
    try {
        const authResult = await auth();
        userId = authResult.userId;
    } catch (error) {
        console.log('Auth not available, using fallback data');
        return recentSessionsWithMockData;
    }
    
    const supabase = createSupabaseClient();
    
    if (!userId) {
        return recentSessionsWithMockData;
    }
    
    try {
        // Get session history with companion details and evaluation data
        const { data: sessions, error: sessionError } = await supabase
            .from('session_history')
            .select(`
                id,
                companion_id,
                created_at,
                score,
                summary,
                duration,
                engagement_score,
                comprehension_score,
                participation_score
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (sessionError) {
            console.error('Session history error:', sessionError);
            // Fall back to companions without session data
            const { data: companions, error: companionError } = await supabase
                .from('companions')
                .select('*')
                .limit(limit);
                
            if (companionError) {
                return recentSessionsWithMockData;
            }
            
            return companions?.map(companion => ({
                ...companion,
                lastSessionDate: null,
                lastSessionScore: null,
                lastSessionSummary: null
            })) || [];
        }

        if (!sessions || sessions.length === 0) {
            // No session history, return recent companions without evaluation data
            const { data: companions, error: companionError } = await supabase
                .from('companions')
                .select('*')
                .limit(limit);
                
            if (companionError) {
                return recentSessionsWithMockData;
            }
            
            return companions?.map(companion => ({
                ...companion,
                lastSessionDate: null,
                lastSessionScore: null,
                lastSessionSummary: null
            })) || [];
        }

        // Return unique companions with their latest session data
        const companionMap = new Map();
        sessions.forEach((session: any) => {
            const companions = session.companions;
            if (companions && companions.id) {
                if (!companionMap.has(companions.id)) {
                    companionMap.set(companions.id, {
                        ...companions,
                        lastSessionDate: new Date(session.created_at).toLocaleDateString(),
                        lastSessionScore: session.score || null,
                        lastSessionSummary: session.summary || null
                    });
                }
            }
        });
        
        return Array.from(companionMap.values());
        
    } catch (error) {
        console.error('Error in getRecentSessions:', error);
        return recentSessionsWithMockData;
    }
}

const recentSessionsWithMockData = [
    {
        id: "1",
        subject: "science",
        name: "Neura the Brainy Explorer",
        topic: "Neural Network of the Brain",
        duration: 45,
        color: "#E5D0FF",
        lastSessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        lastSessionScore: 87,
        lastSessionSummary: "Explored key concepts and conducted virtual experiments with excellent engagement"
    },
    {
        id: "2",
        subject: "maths",
        name: "Countsy the Number Wizard",
        topic: "Derivatives & Integrals",
        duration: 30,
        color: "#FFDA6E",
        lastSessionDate: null,
        lastSessionScore: null,
        lastSessionSummary: null
    },
    {
        id: "3",
        subject: "language",
        name: "Verba the Vocabulary Builder", 
        topic: "English Literature",
        duration: 30,
        color: "#BDE7FF",
        lastSessionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        lastSessionScore: 92,
        lastSessionSummary: "Improved vocabulary and grammar understanding through detailed discussions"
    }
];

// Fallback function for when new columns don't exist
const getRecentSessionsBasic = async (limit = 10) => {
    const supabase = createSupabaseClient();
    
    const { data: sessions, error: sessionError } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (sessionError || !sessions || sessions.length === 0) {
        return await getAllCompanionsAsRecent(limit);
    }

    // Return unique companions from sessions (remove duplicates)
    const companionMap = new Map();
    sessions.forEach((session: any) => {
        const companions = session.companions;
        if (companions && companions.id) {
            if (!companionMap.has(companions.id)) {
                companionMap.set(companions.id, {
                    ...companions,
                    lastSessionDate: null,
                    lastSessionScore: null,
                    lastSessionSummary: null
                });
            }
        }
    });
    
    return Array.from(companionMap.values());
}

const getAllCompanionsAsRecent = async (limit = 10) => {
    const supabase = createSupabaseClient();
    const { data: companions, error: companionError } = await supabase
        .from('companions')
        .select('*')
        .limit(limit);
        
    if (companionError) throw new Error(companionError.message);
    
    // Add mock data for demo purposes - in production this would come from real sessions
    return companions?.map((companion, index) => ({
        ...companion,
        lastSessionDate: index % 3 === 0 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : null,
        lastSessionScore: index % 3 === 0 ? Math.floor(Math.random() * 40) + 60 : null,
        lastSessionSummary: index % 3 === 0 ? generateMockSummary(companion.subject, companion.topic) : null
    })) || [];
}

// Generate mock summaries for demo
const generateMockSummary = (subject: string, topic: string) => {
    const summaries = {
        science: [
            "Explored key concepts and conducted virtual experiments",
            "Discussed scientific principles with great engagement",
            "Analyzed complex theories and their real-world applications"
        ],
        maths: [
            "Solved challenging problems step by step",
            "Mastered new mathematical concepts and formulas",
            "Applied theoretical knowledge to practical scenarios"
        ],
        language: [
            "Improved vocabulary and grammar understanding",
            "Analyzed literary works and writing techniques",
            "Practiced speaking and comprehension skills"
        ],
        history: [
            "Examined historical events and their significance",
            "Connected past events to modern-day implications",
            "Discussed key figures and their contributions"
        ],
        coding: [
            "Built functional code and debugged issues",
            "Learned new programming concepts and best practices",
            "Implemented algorithms and data structures"
        ],
        economics: [
            "Analyzed market trends and economic principles",
            "Explored supply and demand relationships",
            "Discussed economic policies and their impacts"
        ]
    };
    
    const subjectSummaries = summaries[subject as keyof typeof summaries] || summaries.science;
    return subjectSummaries[Math.floor(Math.random() * subjectSummaries.length)];
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if(error) throw new Error(error.message);

    return data.map(({ companions }) => companions);
}

export const getUserCompanions = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('author', userId)

    if(error) throw new Error(error.message);

    return data;
}

export const newCompanionPermissions = async () => {
    // Always allow creating companions - no limits for free use
    return true;
}

// Bookmarks
export const addBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from("bookmarks").insert({
    companion_id: companionId,
    user_id: userId,
  });
  if (error) {
    throw new Error(error.message);
  }
  // Revalidate the path to force a re-render of the page

  revalidatePath(path);
  return data;
};

export const removeBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("companion_id", companionId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(path);
  return data;
};

// It's almost the same as getUserCompanions, but it's for the bookmarked companions
export const getBookmarkedCompanions = async (userId: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select(`companions:companion_id (*)`) // Notice the (*) to get all the companion data
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  // We don't need the bookmarks data, so we return only the companions
  return data.map(({ companions }) => companions);
};

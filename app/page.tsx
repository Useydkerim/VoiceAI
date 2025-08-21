import CompanionsList from "@/components/CompanionsList";
import CTA from "@/components/CTA";
import {recentSessions} from "@/constants";
import {getRecentSessions} from "@/lib/actions/companion.actions";
import { currentUser } from "@clerk/nextjs/server";

const Page = async () => {
    let user = null;
    try {
        user = await currentUser();
    } catch (error) {
        console.log('User not authenticated');
    }

    // Only show recently completed sessions if user is authenticated
    if (!user) {
        return (
            <main>
                <section className="home-section">
                    <CTA fullPage={true} />
                </section>
            </main>
        );
    }

    try {
        const recentSessionsCompanions = await getRecentSessions(10);
        
        return (
            <main>
                <section className="home-section">
                    <CompanionsList
                        title="Recently completed sessions"
                        companions={recentSessionsCompanions}
                        classNames="w-2/3 max-lg:w-full"
                    />
                    <CTA />
                </section>
            </main>
        );
    } catch (error) {
        console.error('Database error:', error);
        // Fallback to static data if database fails
        const recentSessionsCompanions = recentSessions;

        return (
            <main>
                <section className="home-section">
                    <CompanionsList
                        title="Recently completed sessions"
                        companions={recentSessionsCompanions}
                        classNames="w-2/3 max-lg:w-full"
                    />
                    <CTA />
                </section>
            </main>
        );
    }
}

export default Page
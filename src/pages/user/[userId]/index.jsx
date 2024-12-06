import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Loader from "@/components/(layout)/Loader";
import UserData from "@/components/(user)/UserData";
import NowPlaying from "@/components/(user)/NowPlaying";
import RecentSongs from "@/components/(user)/RecentSongs";
import TopArtists from "@/components/(user)/TopArtists";
import TopSongs from "@/components/(user)/TopSongs";
import TopGenres from "@/components/(user)/TopGenres";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAccessToken } from "@/lib/getAccessToken";

export default function UserPage({ userId, initialAccessToken }) {
    const { data: session } = useSession();
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(initialAccessToken);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const tabs = [
        { id: 0, label: "Top Artists", component: <TopArtists userId={userId} /> },
        { id: 1, label: "Top Songs", component: <TopSongs userId={userId} /> },
    ];

    const handleNextTab = () => {
        setActiveTabIndex((prevIndex) => (prevIndex + 1) % tabs.length);
    };

    const handlePreviousTab = () => {
        setActiveTabIndex((prevIndex) => (prevIndex - 1 + tabs.length) % tabs.length);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                setUser(userDoc.data());
            } else {
                console.log("No such user!");
            }
        };

        fetchUserData();
    }, [userId]);

    useEffect(() => {
        const refreshAccessToken = async () => {
            if (!accessToken) {
                const newAccessToken = await getAccessToken(userId);
                setAccessToken(newAccessToken);
            }
        };

        if (!accessToken) {
            refreshAccessToken();
        }
    }, [userId, accessToken]);

    if (!user || !accessToken) {
        return <Loader />;
    }

    return (
        <div className="h-screen p-3">
            <div className="flex flex-col lg:flex-row gap-3 h-full">
                <div className="w-full lg:w-1/3 flex flex-col gap-3 h-full">
                    <UserData session={session} user={user} userId={userId} />
                    {isPlaying ? (
                        <NowPlaying userId={userId} onIsPlayingChange={setIsPlaying} />
                    ) : (
                        <RecentSongs userId={userId} />
                    )}
                </div>
                <div className="w-full lg:w-2/3 flex flex-col bg-[#121212] rounded-lg p-3">
                    {tabs[activeTabIndex].component}
                    <div className="flex justify-end gap-3">
                        <button onClick={handlePreviousTab} className="p-1 rounded-full bg-[#1F1F1F] text-white"><ChevronLeft /></button>
                        <button onClick={handleNextTab} className="p-1 rounded-full bg-[#1F1F1F] text-white"><ChevronRight /></button>
                    </div>
                </div>
                <div className="w-full lg:w-1/3 flex flex-col gap-3 h-full">
                    <TopGenres userId={userId} />
                </div>
            </div>
            <div className="hidden">
                <NowPlaying userId={userId} onIsPlayingChange={setIsPlaying} />
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const { userId } = context.params;

    if (!userId) {
        return {
            notFound: true,
        };
    }

    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        let accessToken = null;
        if (userDoc.exists()) {
            accessToken = userDoc.data().accessToken;
        }

        if (!accessToken) {
            return {
                notFound: true,
            };
        }

        return {
            props: {
                userId,
                initialAccessToken: accessToken,
            },
        };
    } catch (error) {
        console.error("Error fetching user data:", error);
        return {
            notFound: true,
        };
    }
}
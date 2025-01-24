import React, { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, query } from "firebase/firestore";
import { db } from "./firebase"; // Ensure the path to your Firebase config is correct

interface Team {
  id: number;
  name: string;
  criteria1: number;
  criteria2: number;
  criteria3: number;
  criteria4: number;
  criteria5: number;
}

interface IFirebaseDocs {
  id: string;
}

interface IGroupRating {
  projectId: string;
}

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<IFirebaseDocs[]>();
  const [criteria, setCriteria] = useState<IFirebaseDocs[]>();
  const [groupedRatings, setGroupedRatings] = useState<IGroupRating[]>();


  const sortTeamsDescending = () => {
    const sortedTeams = [...teams].sort((a, b) => averageScore(b) - averageScore(a));
    setTeams(sortedTeams);
  };

  function averageScore(team: Team): number {
    const scores = [
      team.criteria1 || 0,
      team.criteria2 || 0,
      team.criteria3 || 0,
      team.criteria4 || 0,
      team.criteria5 || 0,
    ];
    const total = scores.reduce((sum, score) => sum + score, 0);
    const count = scores.filter((score) => score > 0).length;
    return count > 0 ? Number((total / count).toFixed(1)) : 0;
  }

  async function processRatingsAndProjects() {
    const ratingsCollection = collection(db, "ratings");
    const projectCollection = collection(db, "projects");
  
    // Fetch projects to map projectId -> teamName
    const projectSnapshot = await getDocs(projectCollection);
    const projectList = projectSnapshot.docs.reduce((acc: Record<string, string>, doc) => {
      acc[doc.id] = doc.data().teamName; // Assuming teamName exists in the projects collection
      return acc;
    }, {});
  
    // Set up a query to listen to ratings collection
    const q = query(ratingsCollection);
  
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (ratingsSnapshot) => {
      // Group ratings by projectId
      const grouped = ratingsSnapshot.docs.reduce((acc: Record<string, any[]>, doc) => {
        const rating = { id: doc.id, projectId: doc.data().projectId, ...doc.data() };
        const { projectId } = rating;
        if (!acc[projectId]) {
          acc[projectId] = [];
        }
        acc[projectId].push(rating);
        return acc;
      }, {});
  
      // Calculate criterion scores for each projectId and map teamName
      const projectsData = Object.entries(grouped).map(([projectId, ratings]) => {
        const scores: Record<string, number> = {};
  
        ratings.forEach((rating: any) => {
          const { criterionId, score, timestamp } = rating;
          if (!scores[`criteria${criterionId}`]) {
            scores[`criteria${criterionId}`] = 0;
          }
          scores[`criteria${criterionId}`] += score;
        });
  
        return {
          projectId,
          timestamp: ratings.find(rating => rating.projectId === projectId)?.timestamp,
          teamName: projectList[projectId] || `Project ${projectId}`, // Fallback if teamName is not found
          ...scores,
        };
      });
  
      // Sort projectsData by timestamp in descending order (current timestamp on top)
      const sortedProjectsData = projectsData.sort((a, b) => {
        const timestampA = a.timestamp?.seconds || 0; // Firebase timestamp is in seconds
        const timestampB = b.timestamp?.seconds || 0;
        return timestampB - timestampA; // Swapped for descending order
      });
  
      console.log("Sorted Projects Data (Descending): ", sortedProjectsData);
      setGroupedRatings(sortedProjectsData);
    }, (error) => {
      console.error("Error listening to ratings:", error);
    });
  
    // Return unsubscribe function to be used in cleanup
    return unsubscribe;
  }
  
  
  useEffect(() => {
    // Set up the real-time listener
    const unsubscribe = processRatingsAndProjects();

    // Cleanup function
    return () => {
      // Unsubscribe from the listener when component unmounts
      unsubscribe.then((unsub) => unsub());
    };
  }, []);
  
  useEffect(() => {
    if (groupedRatings) {
      if (groupedRatings.length > 0) {
        const updatedTeams = groupedRatings.map((project: any, index: number) => ({
          id: index + 1, 
          name: project.teamName, 
          criteria1: project.criteria1 || 0,
          criteria2: project.criteria2 || 0,
          criteria3: project.criteria3 || 0,
          criteria4: project.criteria4 || 0,
          criteria5: project.criteria5 || 0,
        }));
        setTeams(updatedTeams);
      }
    }
  }, [groupedRatings]);

  return (
    <div className="min-h-screen bg-[#1D1F21] bg-opacity-70 flex items-center justify-center p-16 relative">
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src="/v1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="w-full max-w-8xl backdrop-blur-lg bg-white/10 rounded-lg shadow-2xl relative flex flex-col">
        {/* Title */}
        <div className="bg-[#2B2B2B] p-6 rounded-t-lg flex items-center justify-center">
          <h1 className="text-6xl text-[#fff] flex items-center gap-3">
            round 1 Scoreboard
          </h1>
          <div className='text-right absolute right-10'>
            <button onClick={sortTeamsDescending} className='text-white text-right'>sort</button>
          </div>
        </div>

        {/* Table */}
        <div className="pr-10 pl-10 pb-10 pt-4">
          <table className="w-full text-2xl">
            <thead>
              <tr className="border-b-4 border-[#8C8C8C]">
                <th className="p-4 text-left text-[#fff] flex items-center gap-3 font-light">
                  Team Name
                </th>
                <th className="p-4 text-center text-[#fff] font-light">
                  Criteria 1
                </th>
                <th className="p-4 text-center text-[#fff] font-light">
                  Criteria 2
                </th>
                <th className="p-4 text-center text-[#fff] font-light">
                  Criteria 3
                </th>
                <th className="p-4 text-center text-[#fff] font-light">
                  Criteria 4
                </th>
                {/* <th className="p-4 text-center text-[#fff] font-light">
                  Criteria 5
                </th> */}
                <th className="p-4 text-center text-[#FFB640] font-light">
                  Average Score
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr
                  key={team.id}
                  className={`border-b-2 border-[#8A8A8A] hover:bg-[#3A3A3A] transition-colors duration-900 animate-fade-slide-in delay-${index}`}
                >
                  <td className="p-6 text-[#E1E1E1] text-2xl">{team.name}</td>
                  <td className="p-6 text-center text-[#E1E1E1] text-2xl">
                    <span className="bg-[#373737] px-4 py-2 rounded">{team.criteria1}</span>
                  </td>
                  <td className="p-6 text-center text-[#E1E1E1] text-2xl">
                    <span className="bg-[#373737] px-4 py-2 rounded">{team.criteria2}</span>
                  </td>
                  <td className="p-6 text-center text-[#E1E1E1] text-2xl">
                    <span className="bg-[#373737] px-4 py-2 rounded">{team.criteria3}</span>
                  </td>
                  <td className="p-6 text-center text-[#E1E1E1] text-2xl">
                    <span className="bg-[#373737] px-4 py-2 rounded">{team.criteria4}</span>
                  </td>
                  {/* <td className="p-6 text-center text-[#E1E1E1] text-2xl">
                    <span className="bg-[#373737] px-4 py-2 rounded">{team.criteria5}</span>
                  </td> */}
                  <td className="p-6 text-center text-[#E1E1E1] text-2xl">
                    <span className="bg-[#373737] px-4 py-2 rounded text-[#FFB640]">
                      {averageScore(team)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
/**
 * Fallback Placement Guidance
 * Static curated content when AI service is unavailable
 */

export function getFallbackGuidance(topic) {
  const topicLower = topic.toLowerCase();

  // DSA Interview Preparation (most common)
  if (topicLower.includes('dsa') || topicLower.includes('data structure') || topicLower.includes('algorithm')) {
    return `DSA Interview Preparation Guide

Overview: Master data structures and algorithms systematically. Focus on problem-solving patterns, not memorization. Practice consistently on coding platforms.

1. Core Data Structures
Study arrays, linked lists, stacks, queues, trees, graphs, and hash tables. Understand time and space complexity for each operation. YouTube: Striver's A2Z DSA Course, takeUforward.

2. Algorithm Patterns
Learn sliding window, two pointers, binary search, DFS, BFS, dynamic programming, and greedy algorithms. Practice 5-10 problems per pattern. YouTube: NeetCode, Abdul Bari.

3. Problem-Solving Practice
Solve 200+ problems on LeetCode, focusing on medium difficulty. Start with company-specific tagged problems. Practice daily for 2-3 months. YouTube: Love Babbar's 450 DSA Sheet.

4. System Design Basics
Understand arrays vs linked lists trade-offs, hash table collision handling, and tree traversal methods. Know when to use which structure. YouTube: System Design Interview by Tech Dummies.

5. Practice Interviews
Practice explaining your approach out loud. Time yourself solving problems. Get feedback on code quality and communication. YouTube: InterviewBit interview practice series.

Weekly Plan:
Week 1-2: Arrays and Strings (50 problems)
Week 3-4: Linked Lists and Stacks (40 problems)
Week 5-6: Trees and Graphs (60 problems)
Week 7-8: Dynamic Programming (50 problems)
Week 9-10: Revision and Practice Interviews

Start with easy problems, gradually move to medium. Focus on understanding patterns, not solving maximum problems.`;
  }

  // System Design
  if (topicLower.includes('system design') || topicLower.includes('system') || topicLower.includes('architecture')) {
    return `System Design Interview Preparation

Overview: Learn to design scalable, distributed systems. Focus on trade-offs, not perfect solutions. Understand common patterns and components.

1. Fundamentals
Study scalability, availability, consistency, and load balancing concepts. Understand CAP theorem and ACID properties. YouTube: System Design Interview by Tech Dummies, Gaurav Sen.

2. Core Components
Learn about databases (SQL vs NoSQL), caching (Redis), message queues (Kafka), CDN, and load balancers. Know when to use each. YouTube: Tech Dummies, Hussein Nasser.

3. Design Patterns
Master microservices, event-driven architecture, and database sharding. Understand trade-offs between consistency and availability. YouTube: System Design Interview, Tech Dummies.

4. Practice Problems
Design URL shortener, chat system, news feed, and search engine. Practice explaining your design decisions clearly. YouTube: Exponent, Tech Dummies.

5. Scalability Concepts
Learn horizontal vs vertical scaling, database replication, and caching strategies. Understand how to handle millions of requests. YouTube: Gaurav Sen, System Design Interview.

Focus on trade-offs, not perfection. Explain your reasoning clearly. Start with basic design, then add scalability features.`;
  }

  // General Placement Preparation
  return `Placement Preparation Guide

Overview: Prepare systematically across technical skills, coding practice, and interview readiness. Consistency is key to success.

1. Technical Foundation
Strengthen core CS fundamentals: data structures, algorithms, operating systems, and databases. Review concepts regularly. YouTube: Gate Smashers, Abdul Bari.

2. Coding Practice
Solve problems daily on LeetCode, Codeforces, or HackerRank. Focus on problem-solving patterns, not just solutions. YouTube: NeetCode, takeUforward.

3. Projects and Resume
Build 2-3 substantial projects showcasing your skills. Write clean code and document your work. Prepare to explain your projects in detail.

4. Practice Interviews
Practice explaining your thought process while solving problems. Get feedback on communication and problem-solving approach. YouTube: InterviewBit, Pramp.

5. Company Research
Study company-specific interview patterns. Practice problems tagged for your target companies. Understand their tech stack and requirements.

Consistency beats intensity. Practice daily, even if just 30 minutes. Focus on understanding concepts deeply, not just solving problems.`;
}



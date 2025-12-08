// Mock fallback questions in case CSE is not available
const mockQuestions = [
  {
    id: 'fallback-1',
    question: 'What is the time complexity of a binary search algorithm?',
    source: 'LeetCode',
    type: 'MCQ',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctAnswer: 1
  },
  {
    id: 'fallback-2',
    question: 'Explain the concept of RESTful APIs and their key principles.',
    source: 'InterviewBit',
    type: 'Descriptive',
    answer: 'REST (Representational State Transfer) is an architectural style...'
  }
];

const useMockData = () => {
  console.warn('Using mock data for questions');
  return {
    search: async (query) => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const filtered = mockQuestions.filter(q => 
        q.question.toLowerCase().includes(query.toLowerCase()) ||
        (q.options && q.options.some(opt => opt.toLowerCase().includes(query.toLowerCase())))
      );
      return { data: filtered };
    }
  };
};

const searchService = useMockData();

export const fetchQuestions = async ({ search = '' }) => {
  try {
    // Return empty array if no search query
    if (!search.trim()) {
      return { data: [] };
    }
    
    // Use the appropriate search service
    const response = await searchService.search(search);
    return response || { data: [] };
  } catch (error) {
    console.error('Error in fetchQuestions:', error);
    // Fallback to mock data if search fails
    const filtered = mockQuestions.filter(q => 
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      (q.options && q.options.some(opt => opt.toLowerCase().includes(search.toLowerCase())))
    );
    return { data: filtered };
  }
};

export const getCategories = () => {
  return [
    { id: 'SOT', name: 'Science & Technology' },
    { id: 'SOH', name: 'Science & Humanities' },
    { id: 'SOM', name: 'Science & Management' }
  ];
};

export const getQuestionTypes = () => {
  return ['MCQ', 'Coding', 'Descriptive'];
};

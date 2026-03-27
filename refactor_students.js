const fs = require('fs');
const file = 'frontend/src/components/dashboard/admin/StudentDirectory.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace state definitions
content = content.replace(
  /const \[search, setSearch\] = useState\(''\);/,
  `const [searchQuery, setSearchQuery] = useState('');\n  const [appliedSearch, setAppliedSearch] = useState('');`
);
content = content.replace(
  /const studentsPerPage = 10;/,
  `const studentsPerPage = 50;\n  const [totalPages, setTotalPages] = useState(1);\n  const [totalStudents, setTotalStudents] = useState(0);`
);

// 2. Add debounce effect
const debounceEffect = `
  useEffect(() => {
    const timer = setTimeout(() => {
      if (appliedSearch !== searchQuery) {
        setAppliedSearch(searchQuery);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, appliedSearch]);
`;
// Insert after states
content = content.replace(
  /const isLoadingRef = useRef\(false\); \/\/ Track if a load is in progress/,
  `const isLoadingRef = useRef(false); // Track if a load is in progress\n${debounceEffect}`
);

// 3. Update loadStudents dependencies and API call
content = content.replace(
  /const studentsData = await getAllStudents\(\{ limit: 1000 \}, \{ retries: 2, retryDelay: 1000 \}\);/,
  `const studentsData = await getAllStudents({ 
        limit: studentsPerPage,
        page: currentPage,
        search: appliedSearch,
        center: filters.center,
        school: filters.school,
        status: filters.status,
        minCgpa: filters.minCgpa,
        maxCgpa: filters.maxCgpa
      }, { retries: 2, retryDelay: 1000, returnPagination: true });`
);

// Update extraction logic
content = content.replace(
  /let studentsArray = \[\];\n\s*if \(Array\.isArray\(studentsData\)\) \{[\s\S]*?return;\n\s*\}/,
  `let studentsArray = [];
      let paginationData = { totalPages: 1, total: 0 };
      if (studentsData && Array.isArray(studentsData.students)) {
        studentsArray = studentsData.students;
        if (studentsData.pagination) paginationData = studentsData.pagination;
      } else if (Array.isArray(studentsData)) {
        studentsArray = studentsData;
        paginationData.total = studentsArray.length;
      } else {
        console.error('❌ Invalid response format:', studentsData);
        setError('Invalid response format from server');
        setLastErrorTime(new Date().toISOString());
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      setTotalPages(paginationData.totalPages || 1);
      setTotalStudents(paginationData.total || studentsArray.length);`
);

// loadStudents dependencies
content = content.replace(
  /\}, \[\]\);/,
  `}, [currentPage, appliedSearch, filters]);`
);

// 4. Remove local filtering
content = content.replace(
  /const filteredStudents = students\.filter\(\(student\) => \{[\s\S]*?\}\);/g,
  ``
);

// 5. Update downloadFilteredStudents to use students (since filteredStudents is gone)
content = content.replace(/filteredStudents\.length/g, 'totalStudents');
content = content.replace(/filteredStudents\.map/g, 'students.map');
content = content.replace(/filteredStudents\.slice/g, 'students.slice');

// 6. Fix displayedStudents
content = content.replace(
  /const totalPages = Math\.ceil\(totalStudents \/ studentsPerPage\);\n\s*const displayedStudents = students\.slice\([\s\S]*?\);/,
  ``
);
content = content.replace(/displayedStudents\.length/g, 'students.length');
content = content.replace(/displayedStudents\.map/g, 'students.map');

// 7. Update handleFilterChange, clearFilters, and search UI
content = content.replace(
  /value=\{search\}/,
  `value={searchQuery}`
);
content = content.replace(
  /onChange=\{\(e\) => setSearch\(e\.target\.value\)\}/,
  `onChange={(e) => setSearchQuery(e.target.value)}`
);

// 8. Fix Stats display 
content = content.replace(
  /const stats = useMemo\(\(\) => \{[\s\S]*?\}\);/,
  `const stats = { total: totalStudents, active: 'N/A', blocked: 'N/A', inactive: 'N/A' };`
);

content = content.replace(
  /Showing \{totalStudents\} of \{students\.length\} students/g,
  `Showing {students.length} of {totalStudents} students`
);
content = content.replace(
  /\{search(Query)? && <span className="font-medium"> matching "\\{search(Query)?\\}"<\/span>\}/g,
  `{appliedSearch && <span className="font-medium"> matching "{appliedSearch}"</span>}`
);


// 9. Fix Pagination UI condition
content = content.replace(
  /\{totalStudents > studentsPerPage && \(/g,
  `{totalPages > 1 && (`
);

// 10. Fix setupStudentSubscription dependencies
content = content.replace(
  /const cleanup = setupStudentSubscription\(\);\n\n    return \(\) => \{\n      clearPollingInterval\(\);\n      if \(cleanup\) cleanup\(\);\n    \};\n  \}, \[authLoading, user\?\.id, userRole, setupStudentSubscription\]\);/g,
  `const cleanup = setupStudentSubscription();

    return () => {
      clearPollingInterval();
      if (cleanup) cleanup();
    };
  }, [authLoading, user?.id, userRole, setupStudentSubscription, currentPage, appliedSearch, filters]);`
);


fs.writeFileSync(file, content);
console.log('Refactoring complete.');

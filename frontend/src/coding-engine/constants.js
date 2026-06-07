export const CODING_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
];

export const DEFAULT_STARTERS = {
  javascript: `function solution(input) {
  // input may be a string, number, or parsed JSON
  return input;
}
`,
  python: `def solution(input):
    # input may be a string, number, or parsed JSON
    return input
`,
  java: `public static Object solution(Object input) {
    return input;
}
`,
  cpp: `#include <iostream>
#include <string>
using namespace std;

// Read from stdin in main or implement solution logic
int main() {
    return 0;
}
`,
};

export const RUN_DEBOUNCE_MS = 600;

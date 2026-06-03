import React from 'react';
import MockInterviewManagement from './MockInterviewManagement';

/** Legacy route/tab — opens list with create modal (same UX as assessments). */
export default function MockInterviewCreate() {
  return <MockInterviewManagement autoOpenCreate />;
}

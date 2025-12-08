import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X, Loader, Check, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const EXCEL_TEMPLATE = [
  {
    'Job Title': 'e.g., Software Engineer',
    'Company': 'e.g., Tech Corp',
    'Job Type': 'e.g., Full-Time or Internship',
    'Work Mode': 'e.g., Onsite, Remote, or Hybrid',
    'Location': 'e.g., Bangalore, India',
    'Openings': 'e.g., 5',
    'Salary': 'e.g., 10-15 LPA or 1200000',
    'Stipend': 'e.g., 25k/month or 25000',
    'Duration': 'e.g., 6 months (for internships)',
    'Description': 'Detailed job description...',
    'Requirements': 'Required skills and qualifications...',
    'Responsibilities': 'Key responsibilities...',
    'Qualifications': 'e.g., B.Tech in Computer Science',
    'Experience': 'e.g., 2-4 years',
    'Skills': 'e.g., JavaScript, React, Node.js',
    'Website': 'e.g., https://company.com',
    'LinkedIn': 'e.g., https://linkedin.com/company/example',
    'Application Deadline': 'DD/MM/YYYY',
    'Drive Date': 'DD/MM/YYYY',
    'Drive Venue': 'e.g., PW IOI Campus, Bangalore',
    'Contact Person': 'e.g., John Doe',
    'Contact Email': 'e.g., john@company.com',
    'Contact Phone': 'e.g., 9876543210'
  }
];

const ExcelUploader = ({ onJobSelected }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [jobData, setJobData] = useState(null);
  const fileInputRef = useRef(null);

  // Data sanitization functions
  const sanitizeSalaryStipend = (value) => {
    if (!value || String(value).trim() === '') return '';
    
    let valueStr = String(value).trim().toLowerCase();
    
    // Handle "Not Specified", "TBD", etc.
    if (['not specified', 'tbd', 'na', 'n/a', 'negotiable'].some(keyword => valueStr.includes(keyword))) {
      return '';
    }
    
    // Remove currency symbols and extra spaces
    valueStr = valueStr.replace(/[₹$£€,\s]/g, '');
    
    // Handle LPA (Lakh Per Annum) - multiply by 100000
    if (valueStr.includes('lpa')) {
      const lpaMatch = valueStr.match(/(\d+\.?\d*)/);
      if (lpaMatch) {
        const lpaValue = parseFloat(lpaMatch[1]);
        return String(Math.round(lpaValue * 100000));
      }
    }
    
    // Handle ranges with LPA - take first value
    if (valueStr.includes('-') && valueStr.includes('lpa')) {
      const parts = valueStr.split('-');
      const firstPart = parts[0].trim();
      const lpaMatch = firstPart.match(/(\d+\.?\d*)/);
      if (lpaMatch) {
        const lpaValue = parseFloat(lpaMatch[1]);
        return String(Math.round(lpaValue * 100000));
      }
    }
    
    // Handle 'L' notation (lakhs) - multiply by 100000
    if (/\d+\.?\d*l(?!pa)/.test(valueStr)) {
      const match = valueStr.match(/(\d+\.?\d*)l/);
      if (match) {
        const baseValue = parseFloat(match[1]);
        return String(Math.round(baseValue * 100000));
      }
    }
    
    // Handle 'k' notation (thousands) - multiply by 1000
    if (/\d+\.?\d*k/.test(valueStr)) {
      const match = valueStr.match(/(\d+\.?\d*)k/);
      if (match) {
        const baseValue = parseFloat(match[1]);
        return String(Math.round(baseValue * 1000));
      }
    }
    
    // Handle ranges without LPA - take first number
    if (valueStr.includes('-')) {
      const parts = valueStr.split('-');
      const firstMatch = parts[0].match(/\d+/);
      if (firstMatch) {
        return firstMatch[0];
      }
    }
    
    // Remove common text and extract pure number
    valueStr = valueStr.replace(/(per|\/month|\/year|month|year|lakhs?|crores?)/g, '');
    const numericOnly = valueStr.replace(/[^\d]/g, '');
    
    return numericOnly || '';
  };

  const sanitizeDuration = (value) => {
    if (!value || String(value).trim() === '') return '';
    
    let valueStr = String(value).trim();
    
    // Remove common prefixes
    valueStr = valueStr.replace(/internship\s*/gi, '');
    valueStr = valueStr.replace(/duration:?\s*/gi, '');
    valueStr = valueStr.replace(/\s+/g, ' '); // Normalize spaces
    
    return valueStr.trim();
  };

  const sanitizeNumericField = (value) => {
    if (!value || String(value).trim() === '') return '';
    
    const valueStr = String(value).trim();
    
    // Extract only digits
    const numericOnly = valueStr.replace(/[^\d]/g, '');
    
    return numericOnly || '';
  };

  const sanitizeCGPA = (value) => {
    if (!value || String(value).trim() === '') return '';
    
    let valueStr = String(value).trim();
    
    // Handle percentage to CGPA conversion (rough approximation)
    if (valueStr.includes('%')) {
      const percentMatch = valueStr.match(/(\d+\.?\d*)/);
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        // Convert percentage to CGPA (rough formula: CGPA = (Percentage - 10) / 10)
        const cgpa = Math.max(0, Math.min(10, (percent - 10) / 10));
        return String(cgpa.toFixed(1));
      }
    }
    
    // Extract CGPA value
    const cgpaMatch = valueStr.match(/(\d+\.?\d*)/);
    if (cgpaMatch) {
      const cgpa = parseFloat(cgpaMatch[1]);
      // Ensure it's within valid CGPA range (0-10)
      if (cgpa >= 0 && cgpa <= 10) {
        return String(cgpa);
      }
    }
    
    return '';
  };

  // Complete column mapping with all fields
  const mapColumnToField = (header) => {
    const mappings = {
      // Basic Job Information
      'job title': 'jobTitle',
      'position': 'jobTitle',
      'role': 'jobTitle',
      'title': 'jobTitle',
      'company': 'company',
      'organization': 'company',
      'company name': 'company',
      
      // Location
      'location': 'companyLocation',
      'city': 'companyLocation',
      'place': 'companyLocation',
      'company location': 'companyLocation',
      
      // Job Details
      'job type': 'jobType',
      'type': 'jobType',
      'employment type': 'jobType',
      'work mode': 'workMode',
      'mode': 'workMode',
      'work type': 'workMode',
      'employment mode': 'workMode',
      'openings': 'openings',
      'vacancies': 'openings',
      'number of openings': 'openings',
      
      // Compensation
      'salary': 'salary',
      'stipend': 'stipend',
      'compensation': 'salary',
      'duration': 'duration',
      'internship duration': 'duration',
      
      // Company Information
      'website': 'website',
      'company website': 'website',
      'linkedin': 'linkedin',
      'company linkedin': 'linkedin',
      
      // Job Content
      'description': 'description',
      'job description': 'description',
      'requirements': 'requirements',
      'job requirements': 'requirements',
      'responsibilities': 'responsibilities',
      'job responsibilities': 'responsibilities',
      
      // Skills & Qualifications
      'skills': 'skills',
      'technologies': 'skills',
      'tech stack': 'skills',
      'technical skills': 'skills',
      'qualifications': 'qualifications',
      'required qualifications': 'qualifications',
      'qualification': 'qualifications',
      'education': 'qualifications',
      'degree required': 'qualifications',
      'experience': 'experience',
      'required experience': 'experience',
      'specialization': 'specialization',
      
      // Eligibility Criteria
      'year of passing': 'yop',
      'yop': 'yop',
      'passing year': 'yop',
      'min cgpa': 'minCgpa',
      'minimum cgpa': 'minCgpa',
      'cgpa': 'minCgpa',
      'gap allowed': 'gapAllowed',
      'year gaps': 'gapAllowed',
      'gap years': 'gapYears',
      'backlogs': 'backlogs',
      'active backlogs': 'backlogs',
      
      // Dates
      'application deadline': 'applicationDeadline',
      'deadline': 'applicationDeadline',
      'last date': 'applicationDeadline',
      'drive date': 'driveDate',
      'interview date': 'driveDate',
      
      // Drive Details
      'drive venue': 'driveVenue',
      'interview venue': 'driveVenue',
      'venue': 'driveVenue',
      
      // Interview Rounds
      'round 1': 'round1',
      'round 2': 'round2', 
      'round 3': 'round3',
      'round 4': 'round4',
      'round i': 'round1',
      'round ii': 'round2',
      'round iii': 'round3', 
      'round iv': 'round4',
      'first round': 'round1',
      'second round': 'round2',
      'third round': 'round3',
      'fourth round': 'round4',
      'interview round 1': 'round1',
      'interview round 2': 'round2',
      'interview round 3': 'round3',
      'interview round 4': 'round4',
      
      // Contact Information
      'contact email': 'contactEmail',
      'email': 'contactEmail',
      'recruiter email': 'contactEmail',
      'contact phone': 'contactPhone',
      'phone': 'contactPhone',
      'contact number': 'contactPhone',
      'contact person': 'contactPerson',
      'recruiter': 'contactPerson',
      'spoc': 'contactPerson',
      
      // Agreements
      'service agreement': 'serviceAgreement',
      'bond': 'serviceAgreement',
      'blocking period': 'blockingPeriod',
      
      // Additional
      'instructions': 'instructions',
      'additional info': 'instructions',
      'notes': 'instructions'
    };

    const normalizedHeader = header?.toString().toLowerCase().trim();
    return mappings[normalizedHeader] || null;
  };

  // Process Excel data with sanitization
  const processExcelData = (rawData) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing Excel data with sanitization:', rawData);
    }
    
    if (!rawData || rawData.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No raw data provided');
      }
      return null;
    }

    let headers = [];
    let dataRow = null;

    // Handle both array format and object format
    if (Array.isArray(rawData[0])) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Using array format');
      }
      if (rawData.length < 2) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Not enough rows in array format');
        }
        return null;
      }
      
      headers = rawData[0].map((header, index) => ({
        original: header,
        mapped: mapColumnToField(header),
        index
      })).filter(h => h.mapped);
      
      dataRow = rawData[1];
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('Using object format');
      }
      const firstRow = rawData[0];
      headers = Object.keys(firstRow).map(header => ({
        original: header,
        mapped: mapColumnToField(header)
      })).filter(h => h.mapped);
      
      dataRow = rawData[0];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Mapped headers:', headers);
      console.log('Data row:', dataRow);
    }

    if (!dataRow) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No data row found');
      }
      return null;
    }

    // Build job object with sanitization
    const job = { 
      id: 'excel-1',
      rowNumber: 2,
      source: 'excel'
    };

    headers.forEach(({ original, mapped, index: colIndex }) => {
      let value;
      
      if (Array.isArray(dataRow)) {
        value = dataRow[colIndex];
      } else {
        value = dataRow[original];
      }

      if (value !== undefined && value !== null && value !== '') {
        let processedValue = String(value).trim();
        
        // Apply field-specific sanitization
        if (mapped === 'salary' || mapped === 'stipend') {
          processedValue = sanitizeSalaryStipend(processedValue);
          if (process.env.NODE_ENV === 'development') {
            console.log(`Sanitized ${mapped}:`, value, '->', processedValue);
          }
        }
        else if (mapped === 'duration') {
          processedValue = sanitizeDuration(processedValue);
          if (process.env.NODE_ENV === 'development') {
            console.log('Sanitized duration:', value, '->', processedValue);
          }
        }
        else if (mapped === 'openings' || mapped === 'gapYears') {
          processedValue = sanitizeNumericField(processedValue);
          if (process.env.NODE_ENV === 'development') {
            console.log('Sanitized numeric:', value, '->', processedValue);
          }
        }
        else if (mapped === 'minCgpa') {
          processedValue = sanitizeCGPA(processedValue);
          if (process.env.NODE_ENV === 'development') {
            console.log('Sanitized CGPA:', value, '->', processedValue);
          }
        }
        else if (mapped === 'skills') {
          // Handle skills as comma-separated values
          job[mapped] = processedValue.split(',').map(skill => skill.trim()).filter(Boolean);
          if (process.env.NODE_ENV === 'development') {
            console.log('Processed skills:', value, '->', job[mapped]);
          }
          return; // Skip the regular assignment below
        }
        
        // Only assign if we have a valid processed value
        if (processedValue) {
          job[mapped] = processedValue;
        }
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Final processed job with sanitization:', job);
    }

    // Check if job has essential data
    if (!job.jobTitle && !job.company) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Job missing essential data (jobTitle or company)');
      }
      return null;
    }

    return job;
  };

  // Read Excel file
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Reading Excel file...');
      }
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('FileReader loaded, processing...');
          }
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          if (process.env.NODE_ENV === 'development') {
            console.log('Workbook loaded, sheets:', workbook.SheetNames);
          }
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          if (process.env.NODE_ENV === 'development') {
            console.log('Using sheet:', firstSheetName);
          }
          
          // Try both formats
          let jsonData;
          try {
            // First try as array format (preserves header row structure)
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (process.env.NODE_ENV === 'development') {
              console.log('Array format data:', jsonData);
            }
          } catch {
            // Fallback to object format
            jsonData = XLSX.utils.sheet_to_json(worksheet);
            if (process.env.NODE_ENV === 'development') {
              console.log('Object format data:', jsonData);
            }
          }
          
          const processedJob = processExcelData(jsonData);
          if (process.env.NODE_ENV === 'development') {
            console.log('Processed job:', processedJob);
          }
          resolve(processedJob);
        } catch (error) {
          console.error('Error in readExcelFile:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // Process file upload
  const processFile = useCallback(async (file) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('File received:', file?.name, file?.type, file?.size);
    }
    
    if (!file) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No file provided');
      }
      return;
    }
    
    // File validation
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    const validExtensions = ['.xlsx', '.xls'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('File validation:', { hasValidType, hasValidExtension, fileType: file.type });
    }
    
    if (!hasValidType && !hasValidExtension) {
      if (process.env.NODE_ENV === 'development') {
        console.log('File validation failed');
      }
      setUploadError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      if (process.env.NODE_ENV === 'development') {
        console.log('File too large');
      }
      setUploadError('File size must be less than 10MB');
      return;
    }
    
    setIsUploading(true);
    setUploadError('');
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting file processing...');
    }
    
    try {
      const job = await readExcelFile(file);
      
      if (job) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Job extracted successfully:', job);
        }
        setJobData(job);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('No valid job data found');
        }
        setUploadError('No valid job data found in the Excel file. Please ensure the file has proper headers and at least one data row.');
      }
    } catch (error) {
      console.error('Excel processing error:', error);
      setUploadError(`Failed to process Excel file: ${error.message || 'Please check the file format and try again.'}`);
    } finally {
      setIsUploading(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('Processing completed');
      }
    }
  }, []);

  // File drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Job Template');
    XLSX.writeFile(wb, 'Complete_Job_Template.xlsx');
  };

  // Show loading state
  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-1">Processing Excel File</h3>
        <p className="text-gray-500">Extracting job details from your spreadsheet...</p>
      </div>
    );
  }

  // Show job preview after successful upload
  if (jobData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Job Loaded Successfully!</h2>
          <p className="text-gray-600">Review the extracted job details below.</p>
        </div>

        {/* Job Preview */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800 mb-3">Job Details (Row {jobData.rowNumber})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {jobData.jobTitle && (
              <div>
                <span className="font-medium text-green-700">Job Title:</span>
                <p className="text-green-800">{jobData.jobTitle}</p>
              </div>
            )}
            {jobData.company && (
              <div>
                <span className="font-medium text-green-700">Company:</span>
                <p className="text-green-800">{jobData.company}</p>
              </div>
            )}
            {jobData.jobType && (
              <div>
                <span className="font-medium text-green-700">Job Type:</span>
                <p className="text-green-800">{jobData.jobType}</p>
              </div>
            )}
            {jobData.workMode && (
              <div>
                <span className="font-medium text-green-700">Work Mode:</span>
                <p className="text-green-800">{jobData.workMode}</p>
              </div>
            )}
            {jobData.companyLocation && (
              <div>
                <span className="font-medium text-green-700">Location:</span>
                <p className="text-green-800">{jobData.companyLocation}</p>
              </div>
            )}
            {jobData.salary && (
              <div>
                <span className="font-medium text-green-700">Salary:</span>
                <p className="text-green-800">₹{jobData.salary}</p>
              </div>
            )}
            {jobData.stipend && (
              <div>
                <span className="font-medium text-green-700">Stipend:</span>
                <p className="text-green-800">₹{jobData.stipend}</p>
              </div>
            )}
            {jobData.openings && (
              <div>
                <span className="font-medium text-green-700">Openings:</span>
                <p className="text-green-800">{jobData.openings}</p>
              </div>
            )}
            {jobData.driveDate && (
              <div>
                <span className="font-medium text-green-700">Drive Date:</span>
                <p className="text-green-800">{jobData.driveDate}</p>
              </div>
            )}
            {jobData.driveVenue && (
              <div>
                <span className="font-medium text-green-700">Drive Venue:</span>
                <p className="text-green-800">{jobData.driveVenue}</p>
              </div>
            )}
            {jobData.qualifications && (
              <div>
                <span className="font-medium text-green-700">Qualifications:</span>
                <p className="text-green-800">{jobData.qualifications}</p>
              </div>
            )}
            {jobData.minCgpa && (
              <div>
                <span className="font-medium text-green-700">Min CGPA:</span>
                <p className="text-green-800">{jobData.minCgpa}</p>
              </div>
            )}
            {jobData.contactPerson && (
              <div>
                <span className="font-medium text-green-700">Contact Person:</span>
                <p className="text-green-800">{jobData.contactPerson}</p>
              </div>
            )}
            {jobData.contactEmail && (
              <div>
                <span className="font-medium text-green-700">Contact Email:</span>
                <p className="text-green-800">{jobData.contactEmail}</p>
              </div>
            )}
          </div>
          
          {jobData.skills && jobData.skills.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-green-700">Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {jobData.skills.map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {(jobData.round1 || jobData.round2 || jobData.round3 || jobData.round4) && (
            <div className="mt-3">
              <span className="font-medium text-green-700">Interview Rounds:</span>
              <div className="mt-1 space-y-1 text-xs">
                {jobData.round1 && <p className="text-green-800">• Round 1: {jobData.round1}</p>}
                {jobData.round2 && <p className="text-green-800">• Round 2: {jobData.round2}</p>}
                {jobData.round3 && <p className="text-green-800">• Round 3: {jobData.round3}</p>}
                {jobData.round4 && <p className="text-green-800">• Round 4: {jobData.round4}</p>}
              </div>
            </div>
          )}
          
          {jobData.description && (
            <div className="mt-3">
              <span className="font-medium text-green-700">Description:</span>
              <p className="text-green-800 text-sm mt-1">{jobData.description}</p>
            </div>
          )}

          {/* Show sanitization results */}
          <div className="mt-4 pt-3 border-t border-green-200">
            <h4 className="text-xs font-medium text-green-700 mb-2">Data Processing Applied:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-green-600">
              {jobData.salary && (
                <div>✅ Salary format converted to numeric</div>
              )}
              {jobData.stipend && (
                <div>✅ Stipend format converted to numeric</div>
              )}
              {jobData.skills && jobData.skills.length > 0 && (
                <div>✅ Skills parsed as comma-separated list</div>
              )}
              {jobData.openings && (
                <div>✅ Openings converted to numeric</div>
              )}
              {jobData.minCgpa && (
                <div>✅ CGPA format standardized</div>
              )}
              {jobData.driveDate && (
                <div>✅ Drive date format validated</div>
              )}
              {(jobData.round1 || jobData.round2 || jobData.round3 || jobData.round4) && (
                <div>✅ Interview rounds extracted</div>
              )}
              {jobData.contactPerson && (
                <div>✅ Company SPOC details captured</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (process.env.NODE_ENV === 'development') {
                console.log('Sending job to form:', jobData);
              }
              onJobSelected?.(jobData);
            }}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Use This Job →
          </button>
        </div>
      </div>
    );
  }

  // Upload view - initial state
  return (
    <div className="p-6">
      {/* Upload Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed bg-white/70 rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 rounded-full bg-blue-100">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">Single job Excel file (.xlsx, .xls) up to 10MB</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Select Excel File
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Format Guide */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Excel Format Requirements</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• <strong>Headers:</strong> First row should contain column headers</p>
              <p>• <strong>Data:</strong> Second row should contain the job data</p>
              <p>• <strong>Required:</strong> At least Job Title and Company</p>
              <p>• <strong>Salary formats:</strong> "15 LPA", "15-20 LPA", "1500000", "50k/month"</p>
              <p>• <strong>Skills:</strong> Comma-separated values work best</p>
              <p>• <strong>Drive venues:</strong> Multiple venues separated by commas</p>
              <p>• <strong>Interview rounds:</strong> Round 1, Round 2, Round 3, Round 4</p>
              <p>• <strong>File types:</strong> .xlsx, .xls (up to 10MB)</p>
            </div>
            <div className="mt-4">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Download className="h-3 w-3 mr-1.5" />
                Download Complete Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelUploader;

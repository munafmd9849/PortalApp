# Job Description (JD) Upload Format Guide

## Overview
The JD Upload feature automatically extracts structured data from PDF, DOC, or DOCX files. For best results, your job description should follow a clear, structured format.

## Recommended Format Structure

```
JOB DESCRIPTION

Job Title: Software Engineer
Company: Tech Solutions Inc.
Location: Bangalore, India
Job Type: Full-Time
Work Mode: Hybrid
Openings: 5

COMPENSATION
Salary: ₹12-15 LPA
CTC: ₹15 Lakhs per annum
Stipend: ₹25k/month (for internships)

QUALIFICATIONS
• B.Tech in Computer Science or related field
• Minimum 2-3 years of experience
• Strong problem-solving skills

REQUIREMENTS
• Proficiency in JavaScript, React, Node.js
• Experience with REST APIs and databases
• Knowledge of cloud platforms (AWS/Azure)
• Good communication skills

RESPONSIBILITIES
• Develop and maintain web applications
• Collaborate with cross-functional teams
• Write clean and maintainable code
• Participate in code reviews

SKILLS
JavaScript, React, Node.js, SQL, MongoDB, AWS, Docker

BENEFITS
• Health insurance
• Flexible working hours
• Learning and development opportunities
• Performance bonuses

Website: https://techsolutions.com
LinkedIn: https://linkedin.com/company/techsolutions
```

## Field Extraction Patterns

### Required Fields (For Best Results)

| Field | Format Examples | Parser Patterns |
|-------|----------------|-----------------|
| **Job Title** | `Job Title: Software Engineer`<br>`Position: Full Stack Developer`<br>`Role: Data Analyst` | Looks for: "Job Title:", "Position:", "Role:" or first line with job-related keywords |
| **Company** | `Company: ABC Corp`<br>`Organization: Tech Inc` | Looks for: "Company:", "Organization:", "Employer:" |
| **Location** | `Location: Bangalore, India`<br>`Based in: Mumbai` | Looks for: "Location:", "Based in:", "Office:", or city names |

### Optional Fields

| Field | Format Examples | Parser Patterns |
|-------|----------------|-----------------|
| **Salary** | `₹12-15 LPA`<br>`12-15 Lakhs per annum`<br>`₹1,200,000` | Looks for: "Salary:", "CTC:", "Compensation:", or currency patterns |
| **Stipend** | `₹25k/month`<br>`25,000 per month` | Looks for: "Stipend:" or monthly payment patterns |
| **Job Type** | `Full-Time`<br>`Internship`<br>`Part-Time` | Looks for: "Job Type:" or keywords in text |
| **Work Mode** | `Remote`<br>`Hybrid`<br>`On-site` | Looks for: "Work Mode:" or keywords |
| **Skills** | `JavaScript, React, Node.js`<br>Bullet list format | Extracts from keyword list or comma-separated values |
| **Requirements** | Bullet points (• or -)<br>Numbered list | Looks for section with "Requirements:" or "Qualifications:" |
| **Responsibilities** | Bullet points (• or -)<br>Numbered list | Looks for section with "Responsibilities:" |
| **Experience** | `2-3 years`<br>`Minimum 2 years` | Looks for: "Experience:" or year patterns |
| **Website** | `https://company.com` | Looks for: "Website:" or "URL:" |
| **LinkedIn** | `https://linkedin.com/company/example` | Looks for: "LinkedIn:" or LinkedIn URLs |

## Format Tips

### ✅ Best Practices

1. **Use Clear Labels**
   - Format: `Field Name: Value`
   - Example: `Job Title: Software Engineer`
   - Avoid: `Software Engineer` (without label)

2. **Use Bullet Points for Lists**
   - Use `•` or `-` for requirements, skills, benefits
   - Example:
     ```
     REQUIREMENTS
     • JavaScript experience
     • React knowledge
     • Node.js proficiency
     ```

3. **Include Section Headers**
   - Use clear section headers like:
     - `REQUIREMENTS`
     - `RESPONSIBILITIES`
     - `QUALIFICATIONS`
     - `BENEFITS`

4. **Salary Formats (Indian)**
   - `₹12-15 LPA` ✅
   - `12-15 Lakhs per annum` ✅
   - `₹1,200,000` ✅
   - `15 LPA` ✅

5. **Stipend Formats (Internships)**
   - `₹25k/month` ✅
   - `25,000 per month` ✅
   - `₹25,000/month` ✅

6. **Skills Format**
   - Comma-separated: `JavaScript, React, Node.js` ✅
   - Bullet list: 
     ```
     • JavaScript
     • React
     • Node.js
     ```
   - In text: Mentioned naturally in description ✅

### ⚠️ Limitations

1. **Text-Based Files Only**
   - ✅ Works: Text-based PDFs, DOC/DOCX with text
   - ❌ Doesn't work: Scanned PDFs (images), image files

2. **Complex Structures**
   - ❌ Tables: May not extract correctly
   - ❌ Images: Text in images won't be extracted
   - ❌ Complex formatting: May miss some fields

3. **Manual Review Required**
   - Always review and complete missing fields
   - Parser may not extract 100% accurately
   - Some fields may need manual entry

## Supported File Formats

| Format | Extension | Status |
|--------|-----------|--------|
| PDF | `.pdf` | ✅ Supported (text-based only) |
| Word Document | `.doc` | ✅ Supported |
| Word Document (New) | `.docx` | ✅ Supported |
| Plain Text | `.txt` | ✅ Supported |

**File Size Limit:** 10MB

## What Gets Extracted

The parser automatically extracts:

- ✅ Job Title
- ✅ Company Name
- ✅ Location
- ✅ Salary/Stipend
- ✅ Job Type (Full-Time/Internship)
- ✅ Work Mode (Remote/Hybrid/On-site)
- ✅ Skills (from keyword list)
- ✅ Requirements
- ✅ Responsibilities
- ✅ Qualifications
- ✅ Experience
- ✅ Benefits
- ✅ Website URL
- ✅ LinkedIn URL
- ✅ Openings
- ✅ Duration (for internships)

## Example: Well-Formatted JD

```
JOB DESCRIPTION

Job Title: Full Stack Developer
Company: Innovative Tech Solutions
Location: Bangalore, Karnataka
Job Type: Full-Time
Work Mode: Hybrid
Openings: 3

COMPENSATION
Salary: ₹15-20 LPA
CTC: ₹18 Lakhs per annum

QUALIFICATIONS
• B.Tech/B.E. in Computer Science or related field
• Minimum 3-5 years of experience
• Strong problem-solving and analytical skills

REQUIREMENTS
• Proficiency in JavaScript, React, Node.js
• Experience with MongoDB and PostgreSQL
• Knowledge of AWS cloud services
• Understanding of REST APIs and GraphQL
• Experience with Docker and CI/CD pipelines

RESPONSIBILITIES
• Design and develop scalable web applications
• Collaborate with cross-functional teams
• Write clean, maintainable, and well-documented code
• Participate in code reviews and technical discussions
• Mentor junior developers

SKILLS
JavaScript, React, Node.js, MongoDB, PostgreSQL, AWS, Docker, Git

BENEFITS
• Competitive salary package
• Health insurance for family
• Flexible working hours
• Remote work options
• Learning and development budget
• Performance-based bonuses

Website: https://innovativetech.com
LinkedIn: https://linkedin.com/company/innovativetech
```

## Troubleshooting

### Parser Not Extracting Fields?

1. **Check Format**
   - Ensure fields have clear labels (e.g., "Job Title:", not just "Software Engineer")
   - Use section headers for better organization

2. **Check File Type**
   - Ensure PDF is text-based (not scanned image)
   - Try converting to DOCX if PDF parsing fails

3. **Manual Entry**
   - If parser misses fields, use "Manual Entry" mode
   - Review parsed data and complete missing fields

4. **Common Issues**
   - **Salary not extracted:** Use format like "₹12-15 LPA" or "12-15 Lakhs"
   - **Skills not found:** Ensure skills are mentioned in text or use comma-separated list
   - **Requirements not extracted:** Use bullet points (• or -) under "REQUIREMENTS:" section

## Need Help?

If you're having trouble with JD parsing:
1. Check the format guide above
2. Review the example format
3. Use "Manual Entry" mode as fallback
4. Contact support if issues persist


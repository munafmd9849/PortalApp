# Cursor Consistency Action Plan

## Overview
This document outlines the systematic approach to ensure consistent cursor styles across all interactive elements in the Portal project.

---

## Cursor Type Guidelines

### 1. **cursor-pointer** (Hand/Clickable)
   - All buttons (`<button>`, `type="button"`, `type="submit"`)
   - All links (`<a>`, `<Link>`, `<NavLink>`)
   - Clickable divs/elements with `onClick` handlers
   - Dropdowns/Select elements
   - File input labels
   - Interactive icons (edit, delete, close, etc.)
   - Tab buttons
   - Navigation items
   - Cards/items that are clickable
   - Checkboxes and radio buttons
   - Toggle switches

### 2. **cursor-text** (Text Input)
   - Text input fields (`<input type="text">`, `<input type="email">`, etc.)
   - Textarea elements
   - Number inputs
   - Date inputs
   - Search inputs

### 3. **cursor-not-allowed** (Disabled/Blocked)
   - Disabled buttons (`disabled={true}`)
   - Disabled inputs
   - Disabled links
   - Read-only fields that shouldn't be edited
   - Elements with `pointer-events-none` (if cursor should show)

### 4. **cursor-default** (Default)
   - Non-interactive text
   - Static images
   - Labels (unless they're clickable)
   - Headers/titles
   - Regular paragraphs

### 5. **cursor-grab / cursor-grabbing** (Drag)
   - Draggable elements
   - Resize handles
   - Drag handles (like sidebar resize)

### 6. **cursor-move** (Move)
   - Movable elements
   - Sortable list items

---

## Implementation Strategy

### Phase 1: Core Components (Priority: HIGH)

#### 1.1 Buttons
**Files to Update:**
- `frontend/src/components/landing/Login.jsx`
- `frontend/src/components/auth/LoginForm.jsx`
- `frontend/src/components/auth/RegisterForm.jsx`
- `frontend/src/components/auth/ResetPasswordForm.jsx`
- `frontend/src/pages/dashboard/StudentDashboard.jsx` (all buttons)
- `frontend/src/components/dashboard/admin/*.jsx` (all admin buttons)
- `frontend/src/components/dashboard/student/*.jsx` (all student buttons)
- `frontend/src/components/dashboard/shared/*.jsx` (shared buttons)

**Action:**
- Add `cursor-pointer` to all `<button>` elements
- Add `cursor-not-allowed` to disabled buttons: `className={...} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`

**Example:**
```jsx
// Before
<button onClick={handleClick} disabled={loading}>
  Submit
</button>

// After
<button 
  onClick={handleClick} 
  disabled={loading}
  className={`... ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
>
  Submit
</button>
```

#### 1.2 Links
**Files to Update:**
- `frontend/src/components/landing/Header.jsx`
- `frontend/src/components/landing/Footer.jsx`
- `frontend/src/components/dashboard/shared/DashboardLayout.jsx`
- All navigation components

**Action:**
- Add `cursor-pointer` to all `<a>`, `<Link>`, `<NavLink>` elements

**Example:**
```jsx
// Before
<a href="#placements">Placements</a>

// After
<a href="#placements" className="cursor-pointer">Placements</a>
```

#### 1.3 Dropdowns/Selects
**Files to Update:**
- `frontend/src/components/common/CustomDropdown.jsx`
- `frontend/src/components/common/SelectDropdown.jsx`
- All `<select>` elements across the project

**Action:**
- Add `cursor-pointer` to dropdown trigger buttons
- Add `cursor-pointer` to dropdown option items
- Add `cursor-pointer` to native `<select>` elements

**Example:**
```jsx
// CustomDropdown.jsx - Already has cursor-pointer on options, but check trigger button
<button
  type="button"
  className="... cursor-pointer"  // Add this
  onClick={() => setIsOpen(prev => !prev)}
>
```

#### 1.4 Input Fields
**Files to Update:**
- All form components
- `frontend/src/pages/dashboard/StudentDashboard.jsx` (Edit Profile form)
- `frontend/src/components/dashboard/admin/CreateJob.jsx`
- `frontend/src/components/dashboard/student/Query.jsx`
- All login/register forms

**Action:**
- Add `cursor-text` to text inputs, textareas, email inputs
- Add `cursor-pointer` to file inputs and their labels
- Add `cursor-pointer` to date pickers
- Add `cursor-not-allowed` to disabled/readonly inputs

**Example:**
```jsx
// Text input
<input 
  type="text" 
  className="... cursor-text"
/>

// File input label
<label className="cursor-pointer">
  Upload File
  <input type="file" className="hidden" />
</label>

// Disabled input
<input 
  type="text" 
  disabled 
  className="... cursor-not-allowed"
/>
```

### Phase 2: Interactive Elements (Priority: MEDIUM)

#### 2.1 Clickable Icons
**Files to Update:**
- `frontend/src/components/dashboard/shared/DashboardLayout.jsx` (edit profile icon)
- All delete/edit/close icons
- Icon buttons throughout the project

**Action:**
- Add `cursor-pointer` to all clickable icons
- Ensure icon containers with onClick have `cursor-pointer`

**Example:**
```jsx
// Before
<button onClick={handleEdit} className="p-1">
  <SquarePen className="h-3 w-3" />
</button>

// After
<button onClick={handleEdit} className="p-1 cursor-pointer">
  <SquarePen className="h-3 w-3" />
</button>
```

#### 2.2 Tabs and Navigation
**Files to Update:**
- `frontend/src/pages/dashboard/StudentDashboard.jsx` (tab buttons)
- `frontend/src/components/dashboard/admin/AdminPanel.jsx`
- All tab navigation components

**Action:**
- Add `cursor-pointer` to all tab buttons
- Add `cursor-pointer` to navigation menu items

#### 2.3 Cards and Clickable Items
**Files to Update:**
- Job cards in `frontend/src/components/dashboard/student/JobPostingsSection.jsx`
- Student cards in admin directory
- Any card with onClick handlers

**Action:**
- Add `cursor-pointer` to clickable cards/items

**Example:**
```jsx
// Before
<div onClick={handleClick} className="card">
  Content
</div>

// After
<div onClick={handleClick} className="card cursor-pointer">
  Content
</div>
```

#### 2.4 Checkboxes and Radio Buttons
**Files to Update:**
- All forms with checkboxes
- `frontend/src/pages/dashboard/StudentDashboard.jsx` (terms checkbox)

**Action:**
- Add `cursor-pointer` to checkbox and radio button labels
- Ensure the input itself has appropriate cursor

### Phase 3: Special Cases (Priority: LOW)

#### 3.1 Drag and Drop
**Files to Update:**
- `frontend/src/components/resume/ResumeBuilder.jsx` (drag handles)
- `frontend/src/pages/dashboard/StudentDashboard.jsx` (sidebar resize)

**Action:**
- Add `cursor-grab` for draggable elements
- Add `cursor-grabbing` on drag active state
- Add `cursor-col-resize` for resize handles

**Example:**
```jsx
<div 
  onMouseDown={handleMouseDown}
  className="cursor-col-resize"
>
  Resize Handle
</div>
```

#### 3.2 File Upload Areas
**Files to Update:**
- `frontend/src/components/resume/ResumeManager.jsx`
- `frontend/src/components/resume/ResumeBuilder.jsx`
- All file upload components

**Action:**
- Add `cursor-pointer` to file upload drop zones
- Add `cursor-pointer` to "Choose File" buttons

#### 3.3 Modal and Dialog Elements
**Files to Update:**
- `frontend/src/components/landing/LoginModal.jsx`
- All modal components

**Action:**
- Add `cursor-pointer` to close buttons (X icons)
- Add `cursor-pointer` to modal action buttons
- Add `cursor-not-allowed` to disabled modal buttons

---

## File-by-File Checklist

### High Priority Files (Start Here)

1. **`frontend/src/pages/dashboard/StudentDashboard.jsx`**
   - [ ] All buttons (Save, Reset, Add, Delete, etc.)
   - [ ] Tab navigation buttons
   - [ ] Edit profile icon button
   - [ ] File inputs and labels
   - [ ] Checkbox labels
   - [ ] Dropdowns (CustomDropdown usage)
   - [ ] Text inputs (cursor-text)
   - [ ] Disabled buttons (cursor-not-allowed)

2. **`frontend/src/components/common/CustomDropdown.jsx`**
   - [ ] Dropdown trigger button (add cursor-pointer)
   - [ ] Dropdown options (already has, verify)

3. **`frontend/src/components/dashboard/shared/DashboardLayout.jsx`**
   - [ ] Edit profile button
   - [ ] Navigation links
   - [ ] Logout button

4. **`frontend/src/components/landing/LoginModal.jsx`**
   - [ ] All buttons
   - [ ] Input fields
   - [ ] Close button
   - [ ] Tab switches

5. **`frontend/src/components/auth/LoginForm.jsx`**
   - [ ] Submit button
   - [ ] Google login button
   - [ ] Input fields
   - [ ] Select dropdown

### Medium Priority Files

6. **`frontend/src/components/dashboard/admin/CreateJob.jsx`**
   - [ ] All form buttons
   - [ ] Input fields
   - [ ] File upload areas
   - [ ] Dropdowns

7. **`frontend/src/components/dashboard/student/Query.jsx`**
   - [ ] Query type buttons
   - [ ] Submit button
   - [ ] Input fields
   - [ ] File upload

8. **`frontend/src/components/resume/ResumeBuilder.jsx`**
   - [ ] Mode buttons (Build, Upload, ATS)
   - [ ] Section tabs
   - [ ] Add/Delete buttons
   - [ ] File upload area
   - [ ] Save/Export buttons

9. **`frontend/src/components/dashboard/admin/JobPostingsManager.jsx`**
   - [ ] Action buttons (Approve, Reject, etc.)
   - [ ] Filter dropdowns
   - [ ] Search inputs

10. **`frontend/src/components/landing/Header.jsx`**
    - [ ] Navigation links
    - [ ] Login button

11. **`frontend/src/components/landing/Footer.jsx`**
    - [ ] Footer links
    - [ ] Action buttons

### Lower Priority Files

12. All other dashboard components
13. All other landing page components
14. All other form components

---

## Testing Checklist

After implementation, test the following:

- [ ] Hover over all buttons → Should show pointer cursor
- [ ] Hover over all links → Should show pointer cursor
- [ ] Hover over text inputs → Should show text cursor
- [ ] Hover over disabled buttons → Should show not-allowed cursor
- [ ] Hover over file upload areas → Should show pointer cursor
- [ ] Hover over dropdowns → Should show pointer cursor
- [ ] Hover over clickable icons → Should show pointer cursor
- [ ] Hover over tabs → Should show pointer cursor
- [ ] Hover over drag handles → Should show grab/grabbing cursor
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)

---

## Implementation Notes

1. **Tailwind CSS Classes:**
   - Use Tailwind's cursor utilities: `cursor-pointer`, `cursor-text`, `cursor-not-allowed`, `cursor-grab`, `cursor-grabbing`, `cursor-move`, `cursor-col-resize`

2. **Conditional Cursors:**
   - For disabled states, use conditional classes:
   ```jsx
   className={`... ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
   ```

3. **Consistency:**
   - Ensure similar elements have the same cursor type across the project
   - Document any exceptions in code comments

4. **Accessibility:**
   - Cursor changes should align with actual interactivity
   - Don't add cursor-pointer to non-interactive elements

5. **Performance:**
   - Cursor changes are CSS-only, so no performance impact
   - Use Tailwind classes instead of inline styles for consistency

---

## Estimated Effort

- **Phase 1 (Core Components):** 4-6 hours
- **Phase 2 (Interactive Elements):** 3-4 hours
- **Phase 3 (Special Cases):** 2-3 hours
- **Testing:** 1-2 hours

**Total Estimated Time:** 10-15 hours

---

## Priority Order

1. **Start with:** `StudentDashboard.jsx` (most used component)
2. **Then:** `CustomDropdown.jsx` (reusable component)
3. **Then:** `DashboardLayout.jsx` (shared layout)
4. **Then:** All auth forms
5. **Then:** Admin components
6. **Finally:** Landing page and other components

---

## Review Criteria

Before marking as complete, ensure:
- ✅ All interactive elements have appropriate cursors
- ✅ Disabled states show not-allowed cursor
- ✅ Text inputs show text cursor
- ✅ No non-interactive elements have pointer cursor
- ✅ Consistent cursor behavior across similar elements
- ✅ Tested in multiple browsers
- ✅ No console errors related to cursor styles

---

## Notes

- Some components may already have cursor styles - verify before adding
- Use browser DevTools to inspect cursor behavior
- Consider user feedback after implementation
- Document any edge cases or exceptions

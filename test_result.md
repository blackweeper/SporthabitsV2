#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Batch of 7 features/fixes on the IronFlow app: (1) retroactive date picker for body measurements, (2) custom cropper for progression photos, (3) custom cropper for profile photo, (4) interactive widget grid on dashboard with multi-click habits, (5) swipe-to-delete on training history, (6) fix broken save button on custom program creation, (7) new Cardio sub-tab in Entraînements with cardio program creation + display on dashboard. Extra: swipe-to-delete also on the Séances (individual plans) sub-tab."

frontend:
  - task: "Fix broken 'Sauvegarder' button on custom program creation + auto-activate new program"
    implemented: true
    working: "NA"
    file: "app/custom-program/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Rebuilt as a proper CTA (pill with checkmark icon, larger hit area 16px). Renamed SAUVER→SAUVEGARDER. On new program save: auto-activates the program via addActiveProgram + router.replace to the created program page so the user gets clear feedback."

  - task: "Retroactive date picker for body measurements"
    implemented: true
    working: "NA"
    file: "app/measurement/[id].tsx, src/components/DatePickerField.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New DatePickerField component (web=native input[type=date], iOS=modal spinner, Android=dialog) with 'AUJOURD'HUI' shortcut and max date=today. Also updated the save button style."

  - task: "Custom photo cropper (zoom + rotation) integrated into progression and profile photo flows"
    implemented: true
    working: "NA"
    file: "app/photo-crop.tsx, src/utils/imageCropper.ts, app/measurement/[id].tsx, app/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Full custom cropper modal with pan+pinch (RN gesture handler + reanimated), rotate 90°, zoom +/- buttons, reset, rule-of-thirds grid overlay, dimmed background. Bridge API cropImage(uri, opts) returns Promise<CropperResult>. Aspect ratios: 3:4 for progression, 1:1 for profile."

  - task: "Interactive daily widgets on Dashboard (multi-click habits)"
    implemented: true
    working: "NA"
    file: "app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Replaced the 'À faire aujourd'hui' checklist by a 2-col widget grid. Séance widget (auto-completed), habit widgets that increment on tap (0→1→2→0 loop), long-press to open habit settings, small refresh reset button when target>1, dashed '+' widget to create new habit inline. Habit editor save button also restyled."

  - task: "Swipe-to-delete on training history AND on individual sessions"
    implemented: true
    working: "NA"
    file: "app/(tabs)/training.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Wrapped session cards (Historique) and plan cards (Séances) with react-native-gesture-handler Swipeable. Red 'Supprimer' RectButton with trash icon revealed on left-swipe. Confirmation via window.confirm on web / Alert.alert on native. Cancel closes the swipe. Onboarding hint text at top of each list."

  - task: "New Cardio sub-tab in Entraînements + custom cardio program creation + display on dashboard"
    implemented: true
    working: "NA"
    file: "app/(tabs)/training.tsx, app/custom-program/[id].tsx, app/programs.tsx, src/data/programs.ts, src/utils/programs.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added 'cardio' to Program.category union. New CardioView tab (blue theme, 🏃 emoji) with empty state and CTA. Custom-program editor auto-fills cardio defaults when opened with ?category=cardio (28 days, blue color, 🏃 emoji, 'Endurance & cardio' objective). programs.tsx handles category=cardio with dedicated empty state. Active cardio programs surface on the dashboard automatically via the existing 'Programmes actifs' section."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 14
  run_ui: true

test_plan:
  current_focus:
    - "Fix broken 'Sauvegarder' button on custom program creation + auto-activate new program"
    - "Retroactive date picker for body measurements"
    - "Custom photo cropper (zoom + rotation) integrated into progression and profile photo flows"
    - "Interactive daily widgets on Dashboard (multi-click habits)"
    - "Swipe-to-delete on training history AND on individual sessions"
    - "New Cardio sub-tab in Entraînements + custom cardio program creation + display on dashboard"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Delivered 7 user requests + 1 extra (swipe-to-delete also on Séances). All flows work locally on web (validated via Playwright screenshots inline during development). Please validate end-to-end on frontend only — no backend changes were made. Focus specifically on: (a) the SAUVEGARDER button flow (form validation + auto-activation), (b) the multi-click habit widgets on the dashboard (increment/reset cycle with target>1), (c) both swipe-to-delete flows (Historique + Séances), (d) cardio creation with ?category=cardio defaults, (e) DatePickerField opens and stores a past date, (f) crop modal opens after image selection on both measurement and profile flows and returns to caller with the cropped image applied. All 'SAUVER' buttons were harmonized to 'SAUVEGARDER' pill CTAs."

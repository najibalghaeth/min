/* common actions that affect different parts of the UI (webviews, tabstrip, etc) */

/* loads a page in a webview */

function navigate (tabId, newURL) {
  newURL = urlParser.parse(newURL)

  tabs.update(tabId, {
    url: newURL
  })

  webviews.update(tabId, newURL)

  leaveTabEditMode({
    blur: true
  })
}

/* destroys a task object and the associated webviews */

function destroyTask (id) {
  var task = tasks.get(id)

  task.tabs.forEach(function (tab) {
    webviews.destroy(tab.id)
  })

  tasks.destroy(id)
}

/* destroys the webview and tab element for a tab */
function destroyTab (id) {
  var tabEl = getTabElement(id)
  if (tabEl) {
    // The tab does not have a coresponding .tab-item element.
    // This happens when destroying tabs from other task where this .tab-item is not present
    tabEl.parentNode.removeChild(tabEl)
  }

  tabs.destroy(id) // remove from state - returns the index of the destroyed tab
  webviews.destroy(id) // remove the webview
}

/* destroys a task, and either switches to the next most-recent task or creates a new one */

function closeTask (taskId) {
  destroyTask(taskId)

  if (taskId === currentTask.id) {
    // the current task was destroyed, find another task to switch to

    if (tasks.get().length === 0) {
      // there are no tasks left, create a new one
      return addTask()
    } else {
      // switch to the most-recent task

      var recentTaskList = tasks.get().map(function (task) {
        return { id: task.id, lastActivity: tasks.getLastActivity(task.id) }
      })

      // sort the tasks based on how recent they are
      recentTaskList.sort(function (a, b) {
        return b.lastActivity - a.lastActivity
      })

      return switchToTask(recentTaskList[0].id)
    }
  }
}

/* destroys a tab, and either switches to the next tab or creates a new one */
function closeTab (tabId) {
  /* disabled in focus mode */
  if (isFocusMode) {
    showFocusModeError()
    return
  }

  if (tabId === tabs.getSelected()) {
    var currentIndex = tabs.getIndex(tabs.getSelected())
    var nextTab = tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1)

    destroyTab(tabId)

    if (nextTab) {
      switchToTab(nextTab.id)
    } else {
      addTab()
    }
  } else {
    destroyTab(tabId)
  }
}

/* changes the currently-selected task and updates the UI */

function switchToTask (id) {
  tasks.setSelected(id)

  rerenderTabstrip()

  var taskData = tasks.get(id)

  if (taskData.tabs.length > 0) {
    var selectedTab = taskData.tabs.getSelected()

    // if the task has no tab that is selected, switch to the most recent one

    if (!selectedTab) {
      selectedTab = taskData.tabs.get().sort(function (a, b) {
        return b.lastActivity - a.lastActivity
      })[0].id
    }

    switchToTab(selectedTab)
  } else {
    addTab()
  }
}

/* switches to a tab - update the webview, state, tabstrip, etc. */

function switchToTab (id, options) {
  options = options || {}

  /* tab switching disabled in focus mode */
  if (isFocusMode) {
    showFocusModeError()
    return
  }

  leaveTabEditMode()

  // set the tab's lastActivity to the current time

  if (tabs.getSelected()) {
    tabs.update(tabs.getSelected(), {
      lastActivity: Date.now()
    })
  }

  tabs.setSelected(id)
  setActiveTabElement(id)
  webviews.setSelected(id)

  if (options.focusWebview !== false) {
    webviews.get(id).focus()
  }

  updateColorPalette()

  sessionRestore.save()

  tabActivity.refresh()
}

// Unfollow everyone on X (Formerly Twitter) and or unfollow who doesn't follow you back, by Nicholas Resendez (https://twitter.com/nichxbt)
// https://github.com/nirholas/unfollowx
// https://github.com/tahajalili (Ethan JL) - Added feature to keep track of unfollowed users in UnfollowWDFBLog.js
//
// Last Updated: 17 March 2024
(() => {
  const $followButtons = '[data-testid$="-unfollow"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const unfollowedUsers = []; // Array to hold usernames of unfollowed users

  const retry = {
    count: 0,
    limit: 5,
  };

  const scrollToTheBottom = () => window.scrollTo(0, document.body.scrollHeight);
  const retryLimitReached = () => retry.count >= retry.limit;
  const addNewRetry = () => retry.count++;

  const sleep = (seconds) =>
    new Promise((resolve) => {
      console.log(`WAITING FOR ${seconds} SECONDS...`);
      setTimeout(resolve, seconds * 1000);
    });

  const unfollowAll = async (followButtons) => {
    console.log(`UNFOLLOWING ${followButtons.length} USERS...`);
    for (const button of followButtons) {
      // Attempt to extract username for logging purposes
      const usernameElement = button.closest('[data-testid="UserCell"]')?.querySelector('[dir="ltr"]');
      const username = usernameElement ? usernameElement.textContent : "Unknown";
      unfollowedUsers.push(username); // Add username to the array

      button.click(); 
      await sleep(2); 
      document.querySelector($confirmButton)?.click(); 
      await sleep(1); 
    }
  };

  const createDownload = () => {
    const blob = new Blob([unfollowedUsers.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unfollowed-users.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const nextBatch = async () => {
    scrollToTheBottom();
    await sleep(3); 
    let followButtons = Array.from(document.querySelectorAll($followButtons));
    followButtons = followButtons.filter(button => {
      
      const isFollowingBack = button.closest('[data-testid="UserCell"]')?.querySelector('[data-testid="userFollowIndicator"]');
      return !isFollowingBack;
    });

    if (followButtons.length > 0) {
      await unfollowAll(followButtons);
      retry.count = 0; 
      await sleep(3); 
      nextBatch();
    } else if (!retryLimitReached()) {
      addNewRetry();
      await sleep(3); 
      nextBatch();
    } else {
      console.log(`FINISHED PROCESS. TOTAL UNFOLLOWED: ${unfollowedUsers.length}`);
      if (unfollowedUsers.length > 0) {
        createDownload();
      }
    }
  };

  nextBatch();
})();

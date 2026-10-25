(function () {
  'use strict';

  // Replicated from the APK's CrashActivity:
  //   package t.d, Firebase RTDB "https://zoz8-f2d27-default-rtdb.firebaseio.com", node "pre"
  var FIREBASE_DB_URL = 'https://zoz8-f2d27-default-rtdb.firebaseio.com';

  var ref = null; // DatabaseReference "pre"
  var attached = false;

  var btnStart = document.getElementById('linear29');
  var btnAgain = document.getElementById('linear30');
  var valueText = document.getElementById('textview28');
  var loadingOverlay = document.getElementById('loadingOverlay');

  // ---------- Firebase listener (ChildEventListener on "pre") ----------
  function attachListener() {
    if (attached || !ref) return;
    attached = true;

    // onChildAdded  ->  on('child_added')
    ref.on('child_added', function (snapshot) {
      var map = snapshot.val();
      if (map && Object.prototype.hasOwnProperty.call(map, 'hipr')) {
        valueText.textContent = '\u00d7' + map.hipr;
      }
    });

    // onChildChanged -> on('child_changed')
    ref.on('child_changed', function (snapshot) {
      var map = snapshot.val();
      if (map && Object.prototype.hasOwnProperty.call(map, 'hipr')) {
        valueText.textContent = '\u00d7' + map.hipr;
      }
    });
  }

  function detachListener() {
    if (!ref || !attached) return;
    ref.off();
    attached = false;
  }

  // ---------- UI helpers ----------

  // Mirrors _Custom_Loading(boolean)
  function setLoading(show) {
    if (show) {
      loadingOverlay.classList.add('show');
    } else {
      loadingOverlay.classList.remove('show');
    }
  }

  // Mirrors _Edit_By_Volt(view, 11.0d): scale 0.95 -> 1.0 over 650ms
  function popAnimation(el) {
    el.classList.remove('pop');
    void el.offsetWidth; // restart animation
    el.classList.add('pop');
  }

  function setButtonsDim(dim) {
    btnStart.style.opacity = dim ? '0.5' : '1';
    btnAgain.style.opacity = dim ? '0.5' : '1';
  }

  // ---------- Button handlers ----------

  // linear29 -> START
  btnStart.addEventListener('click', function () {
    popAnimation(btnStart);
    popAnimation(btnAgain);
    setButtonsDim(true);
    setLoading(true);

    // after 800ms: hide loading
    setTimeout(function () {
      setLoading(false);
    }, 800);

    // after 900ms: restore alpha and re-attach the Firebase listener
    setTimeout(function () {
      setButtonsDim(false);
      detachListener();
      attachListener();
    }, 900);
  });

  // linear30 -> AGAIN
  btnAgain.addEventListener('click', function () {
    popAnimation(btnAgain);
    popAnimation(btnStart);
    setButtonsDim(true);
    setLoading(true);

    // after 600ms: hide loading
    setTimeout(function () {
      setLoading(false);
    }, 600);

    // after 700ms: restore alpha and reset the value text
    setTimeout(function () {
      setButtonsDim(false);
      valueText.textContent = '\u00d70.00';
    }, 700);
  });

  // ---------- Init (initializeLogic + setupRotatingImage) ----------
  // The background is an animated GIF, so it loops natively on iPhone and Android.
  firebase.initializeApp({ databaseURL: FIREBASE_DB_URL });
  ref = firebase.database().ref('pre');
  attachListener();
})();

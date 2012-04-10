Application.Utils = {
  getDateDiffFromNow:function () {
    var diff = (new Date().getTime() - Application.currentTaskStartedAt.getTime());
    var tzDiff = (Application.currentTaskStartedAt.getTimezoneOffset() * 60 * 1000);
    return new Date(diff + tzDiff);
  },

  buildFormattedDate:function (diffDate) {
    return [diffDate.getHours().toString().lpad('0', 2),
      diffDate.getMinutes().toString().lpad('0', 2),
      diffDate.getSeconds().toString().lpad('0', 2)].join(':');
  },

  loadExistingSettings:function () {
    Application.Database.PTUserUtils.loadSystemUser();
  },

  noticeTimer:null,
  showNotice:function (notice) {
    $.mobile.loadingMessage = notice;
    $.mobile.showPageLoadingMsg();

    if (Application.noticeTimer != null)
      clearTimeout(Application.noticeTimer);

    Application.noticeTimer = setTimeout(function () {
      $.mobile.hidePageLoadingMsg();
    }, 10000);
  },

  hideNotice:function () {
    $.mobile.hidePageLoadingMsg();
  },

  systemNotice: function(msg) {
    var notification = Titanium.Notification.createNotification();
    notification.setMessage(msg);
    notification.setTitle('Time Keeper Notice');
    notification.setTimeout(-1);
    notification.show();
  }
};
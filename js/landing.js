//Класс JBOWidget
class JBOWidget {
  constructor(params = {}) {
    var defaults = {
      //FB Пиксель для лендинга
      fb_pixel_id: null,
      //FB Пиксель для страницы спасибо
      fb_pixel_id2: null,
      //Тип страницы: landing/approval
      pagetype: "landing",
    };
    if (typeof params === "object") {
      this.params = Object.assign(defaults, params);
    }
  }

  //Вставка FB пикселя в страницу
  fb_pixel() {
    let fb_pixel_id = null;
    if (this.params.pagetype == "landing") {
      fb_pixel_id = this.findGetParameter("fb_pixel_id");
    } else {
      fb_pixel_id = this.findGetParameter("fb_pixel_id2");
      if (!fb_pixel_id) {
        fb_pixel_id = this.findGetParameter("fb_pixel_id");
      }
    }
    if (isNaN(fb_pixel_id) || fb_pixel_id == null) {
      fb_pixel_id =
        this.params.pagetype == "landing"
          ? this.params.fb_pixel_id
          : this.params.fb_pixel_id2;
    }

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "//connect.facebook.net/en_US/fbevents.js");
    // Insert Your Facebook Pixel ID below.
    fbq("init", fb_pixel_id);
    fbq("track", "ViewContent");
    fbq("track", "PageView");

    if (this.params.pagetype == "approval") {
      fbq("track", "Lead");
    }

    let subid = this.getSubid();
    if (subid) {
      fbq("track", "view", {
        subid: subid,
      });
    }
  }

  //Добавляет код отслеживания, если в GET параметре отсутствует subid
  async subid(clb) {
    let subId = this.getSubid();
    if (!subId) {
      let campaignId = await this.getCampaignId();
      let self = this;
      if (campaignId) {
        if (!window.KTracking) {
          console.log("Подключаем скрипт трекера");
          window.KTracking = {
            collectNonUniqueClicks: false,
            multiDomain: true,
            R_PATH: "//cpa.jbo.bz/" + campaignId,
            P_PATH: "//cpa.jbo.bz/5cb6ed5/postback",
            listeners: [],
            reportConversion: function () {
              this.queued = arguments;
            },
            getSubId: function (fn) {
              this.listeners.push(fn);
            },
            ready: function (fn) {
              this.listeners.push(fn);
            },
          };
          KTracking.ready(function (subid, token) {
            self.params.subid = subid;
            self.addSubidInputs();
            KTracking.update({
              sub_id_2: window.location.href,
              sub_id_1: self.findGetParameter("fuid"),
            });
            console.log("Получили от трекера subid: ", subid);
	    document.cookie = "subid=" + subid;
            if (typeof clb == "function") {
              clb(subid);
            }
          });
        }
        if (window.KTracking && typeof clb == "function") {
          KTracking.ready(function (subid, token) {
            console.log("Получили от трекера повторно subid: ", subid);
	    document.cookie = "subid=" + subid;
            if (typeof clb == "function") {
              clb(subid);
            }
          });
        }
        (function () {
          var a = document.createElement("script");
          a.type = "application/javascript";
          a.async = false;
          a.src = "//cpa.jbo.bz/js/k.min.js";
          var s = document.getElementsByTagName("script")[0];
          s.parentNode.insertBefore(a, s);
        })();
      }
    } else {
document.cookie = "subid=" + subId;
      if (typeof clb == "function") {
        clb(subId);
      }
    }
  }

  //Получить ID кампании по URL
  async getCampaignId() {
    if (this.params.campaignId) {
      return this.params.campaignId;
    }
    let url = window.location.href.replace(window.location.search, "");
    let result = null;
    try {
      let alias = await this.makeRequest({
        method: "GET",
        url: "/scripts/widget.php",
        params: { url: url, action: "getcampaign" },
      });
      let data = JSON.parse(alias);
      if (data) {
        console.log("Получен ID кампании по умолчанию: ", data.alias);
        this.params.campaignId = data.alias;
        return data.alias;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
    return result;
  }

  //Добавить во все формы поле subid
  addSubidInputs() {
    let self = this;
      let forms = document.getElementsByTagName("form");
      console.log("Добавление subid. Форм на странице: " + forms.length);
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          let queryInput = form.querySelector(
            'input[name="subid"][type="hidden"]'
          );
          if (
            queryInput !== null &&
            queryInput.value != self.params.subid &&
            self.params.subid
          ) {
            queryInput.value = self.params.subid;
          }
          if (!queryInput && self.params.subid) {
            let el = document.createElement("input");
            el.type = "hidden";
            el.name = "subid";
            el.value = self.params.subid;
            form.appendChild(el);
          }
        }
      }
  }

  //Добавить во все формы поле subid
  addUtmInputs() {
    let self = this;
    window.addEventListener("DOMContentLoaded", function () {
      let forms = document.getElementsByTagName("form");
      let utms = [
        "utm_source",
        "utm_content",
        "utm_term",
        "utm_campaign",
        "utm_medium",
        "name",
        "email",
        "phone",
      ];
      console.log("Добавление utm. Форм на странице: " + forms.length);
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          utms.forEach(function (val, index, arr) {
            let utmValue = self.findGetParameter(val);
            let utm = form.querySelector(
              'input[name="' + val + '"]:not(.check-input-bot)'
            );
            if (utm !== null && utm.value == "" && utmValue !== null && !utmValue.match('\{|\}')) {
              utm.value = utmValue;
            }
            if (!utm && utmValue) {
              let el = document.createElement("input");
              el.type = "hidden";
              el.name = val;
              el.value = utmValue;
              form.prepend(el);
            }
          });
        }
      }
    });
  }

  //Добавить трекер Салид
  addSalidTracker() {
    let utmSource = this.findGetParameter("utm_source");
    if (utmSource == "salid") {
      window.addEventListener("DOMContentLoaded", function () {
        let body = document.getElementsByTagName("body")[0];
        let script = document.createElement("script");
        script.async = true;
        script.src = "https://salid.ru/tracker.js";
        script.type = "text/javascript";
        body.appendChild(script);
      });
    }
  }

  //Получить subid
  getSubid() {
    let paramSubid = this.findGetParameter("subid");
    if (paramSubid) {
      console.log("Subid присутствует в GET параметре: " + paramSubid);
      this.params.subid = paramSubid;
      document.cookie = "subid=" + this.params.subid;
      return paramSubid;
    } else {
      let subid = this.getCookieValue("_subid");
      console.log(
        "Subid отсутствует в GET параметре. Ищем в Cookie параметр _subid: " +
          subid
      );
      if (typeof subid === "undefined") {
        console.log(
          "Параметр _subid отсутствует в GET параметре. Ищем в Cookie параметр subid: " +
            subid
        );
        subid = this.getCookieValue("subid");
        console.log("Cookie параметр subid: " + subid);
        if (typeof subid === "undefined") {
          return false;
        } else {
          this.params.subid = subid;
          return subid;
        }
      } else {
        this.params.subid = subid;
        return subid;
      }
    }
    return this.params.subid;
  }

  //Поиск куки по имени
  getCookieValue(name) {
    let value;
    document.cookie.split(";").forEach(function (item) {
      let i = item.trim().split("=");
      if (i[0] == name) {
        value = i[1];
      }
    });
    return value;
  }

  //Получение нужных гет параметров
  findGetParameter(parameterName) {
    var result = null,
      tmp = [];
    var items = location.search.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
      tmp = items[index].split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    }
    return result;
  }

  //Для Ajax запросов
  async makeRequest(opts) {
    return new Promise(function (resolve, reject) {
      var params = opts.params;
      if (params && typeof params === "object") {
        params = Object.keys(params)
          .map(function (key) {
            return (
              encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
            );
          })
          .join("&");
      }
      var xhr = new XMLHttpRequest();

      if (opts.method == "GET") {
        opts.url += "?" + params;
      }
      xhr.open(opts.method, opts.url);
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(xhr.response);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText,
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText,
        });
      };
      if (opts.headers) {
        Object.keys(opts.headers).forEach(function (key) {
          xhr.setRequestHeader(key, opts.headers[key]);
        });
      }
      xhr.send(params);
    });
  }
}

window.jboWidget = new JBOWidget({
  //ID Пикселя по умолчанию для лендинга
  // fb_pixel_id: "201050704281601",
  //ID Пикселя по умолчанию для страницы спасибо
  // fb_pixel_id2: "201050704281601",
  pagetype: "landing",
});


//Установить FB Pixel
// jboWidget.fb_pixel();


//Установить скрипт отслеживания Keitaro
jboWidget.subid(function (subid) {
  //Добавить во все формы скрытое поле subid
  if(document.readyState !== 'loading') {
    jboWidget.addSubidInputs();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      jboWidget.addSubidInputs();
    });
  }
});

//Добавить во все формы скрытое поле с utm метками
jboWidget.addUtmInputs();
//Добавить трекер Салид для их лидов
jboWidget.addSalidTracker();


//Автоотметка чекбоксов политики конфиденциальности 

document.addEventListener("DOMContentLoaded", function(event) { 
  let blocks = document.querySelectorAll(".confidentiality input[type=checkbox]");
	  for( let i = 0; i < blocks.length; i++){
	    blocks[i].checked = true;
	}	
  let blocks2 = document.querySelectorAll(".check--personal input[type=checkbox]");
	  for( let i = 0; i < blocks2.length; i++){
	    blocks2[i].checked = true;
	}	
});

// Проверка адреса почты в формах
document.addEventListener("DOMContentLoaded", function(event) { 
  let emails = $('input[name=email]');

  emails.each(function(){
    $(this).on('change', function(){
      let email = $(this).val(),
          emailPattern  = /^\b[A-Z0-9._%-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b$/i;
      if(!emailPattern.test(email) ){
        $(this).parent().css({'position':'relative'});
        $(this).parents('form').find('button[type=submit]').prop('disabled', true);
        if ($('.error-validate-email').length == 0) {
          $(this).before($('<div/>', {text:'Введите правильный адрес почты', style:'position:absolute;top:-25px;color:red;margin-bottom:5px;font-size:14px;', class:'error-validate-email'}));
        }
      } else {
        let mailArray = ['gmail.ru', 'mai.ru', 'mail.ri', 'googl.com', 'gmail.con', 'mail.ti', 'nail.ru', 'ramnler.ru', 'bk.ruk', 'mail.tu', 'yandex.ry', 'gmai.com', 'tambler.ru'];
        if (mailArray.includes(email.split('@')[1]) && $('.error-validate-email').length == 0) {
            $(this).before($('<div/>', {text:'Введите правильный адрес почты', style:'position:absolute;top:-25px;color:red;margin-bottom:5px;font-size:14px;', class:'error-validate-email'}));
            $(this).siblings('button[type=submit]').prop('disabled', true);
        } else if( (mailArray.includes(email.split('@')[1]) && $('.error-validate-email').length > 0)) {
            $(this).siblings('.error-validate-email').text('Этот адрес также не верный');
            $(this).siblings('button[type=submit]').prop('disabled', true);
        }  else {
            $(this).siblings('.error-validate-email').remove();
            $(this).siblings('button[type=submit]').prop('disabled', false);
        }
      }
    }); 
  });
});


//Поиск куки по имени
function getCookiesValuesForForms(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

// Передача в форму кук для CPA AdvCake и UserID от Яндекс
document.addEventListener("DOMContentLoaded", function(event) { 

  setTimeout(function() {

    let advCakeTrackId = getCookiesValuesForForms('advcake_track_id');
    let advCakeTrackUrl = getCookiesValuesForForms('advcake_track_url');
    
  // добавление скрытого поля с ID для CPA AdvCake
  if (getCookiesValuesForForms('advcake_track_id')) {
    
      let forms = document.getElementsByTagName("form");
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          let el = document.createElement("input");
              el.type = "hidden";
              el.name = 'advcake_trackid';
              el.value = advCakeTrackId;
              form.append(el);
        }
      }
    };

    // добавление скрытого поля с URL для CPA AdvCake
    if (getCookiesValuesForForms('advcake_track_url')) {
    
      let forms = document.getElementsByTagName("form");
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          let el = document.createElement("input");
              el.type = "hidden";
              el.name = 'advcake_url';
              el.value = advCakeTrackUrl;
              form.append(el);
        }
      }
    }

    // Лобавление скрытого поля с userID Я.Метрики

    let yaUserID = getCookiesValuesForForms('_ym_uid');

    if (yaUserID) {
    
      let forms = document.getElementsByTagName("form");
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          let el = document.createElement("input");
              el.type = "hidden";
              el.name = 'clientid';
              el.value = yaUserID;
              form.append(el);
        }
      }
    }

    // Лобавление скрытого поля с userID Google Analytics

    let gaUserID = getCookiesValuesForForms('_ga_cid');

    if (gaUserID) {
    
      let forms = document.getElementsByTagName("form");
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          let el = document.createElement("input");
              el.type = "hidden";
              el.name = 'ga_ClientID';
              el.value = gaUserID;
              form.append(el);
        }
      }
    }

    // Добавление скрытых полей для СРА affise
    const affiseClId = getCookiesValuesForForms('affise_cl_uid');

    if (affiseClId) {

      const affiseCoockies = [
        'affise_cl_uid',
        'affise_utm_source',
        'affise_utm_campaign'
      ];

      const forms = document.getElementsByTagName("form");

      if(jboWidget.findGetParameter('utm_campaign') == 'affiliate' || !jboWidget.findGetParameter('utm_campaign')) {

        if (forms.length > 0) {
          for (let i = 0; i < forms.length; i++) {

            affiseCoockies.forEach(function(utm) {
              let el = document.createElement("input");
                el.type = "hidden";
                el.name = utm;
                el.value = getCookiesValuesForForms(utm);
                forms[i].append(el);
            });
          }
        }
      } else if ( jboWidget.findGetParameter('utm_campaign') ) {
        if (forms.length > 0) {
          for (let i = 0; i < forms.length; i++) {

            affiseCoockies.forEach(function(utm) {
              
              switch (utm) {
                case 'affise_utm_source': setCookie(utm, jboWidget.findGetParameter('utm_source'), 90);
                break;
              
                case 'affise_utm_campaign': setCookie(utm, jboWidget.findGetParameter('utm_campaign'), 90);
                break;
              }

              let el = document.createElement("input");
                el.type = "hidden";
                el.name = utm;
                el.value = getCookiesValuesForForms(utm);
                forms[i].append(el);
            });
          }
        }
      } 
    }


  }, 5000);
});

// Запись УТМ в куки
function setCookie(name, value, days) {
  const today = new Date();
  today.setTime(today.getTime() + (days*24*60*60*1000));
  let expires = "expires="+ today.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Если посетитель из CPA Affise, то записываем метки в куки
(function() {
  if( jboWidget.findGetParameter('cl_uid') ) {
    let utmToCookies = [
        "cl_uid",
        "utm_source",
        "utm_campaign"
      ];
        
      utmToCookies.forEach(function (val) {
        let utmValue = jboWidget.findGetParameter(val);
        if(utmValue) setCookie('affise_' + val, utmValue, 90);
      });
  }
})();

//roistat
(function(w, d, s, h, id) {
    w.roistatProjectId = id; w.roistatHost = h;
    var p = d.location.protocol == "https:" ? "https://" : "http://";
    var u = /^.*roistat_visit=[^;]+(.*)?$/.test(d.cookie) ? "/dist/module.js" : "/api/site/1.0/"+id+"/init?referrer="+encodeURIComponent(d.location.href);
    var js = d.createElement(s); js.charset="UTF-8"; js.async = 1; js.src = p+h+u; var js2 = d.getElementsByTagName(s)[0]; js2.parentNode.insertBefore(js, js2);
})(window, document, 'script', 'cloud.roistat.com', 'a16e1178eb8d81197f6926c45ea9bd4c');

roistat_aded = 0;

document.addEventListener("DOMContentLoaded", () => {

setInterval(function() {
	
 if(!roistat_aded) {
    let roistat_visit = getCookiesValuesForForms('roistat_visit');

    if (roistat_visit) {
    
      let forms = document.getElementsByTagName("form");
      if (forms.length > 0) {
        for (let i = 0; i < forms.length; i++) {
          let form = forms[i];
          let el = document.createElement("input");
              el.type = "hidden";
              el.name = 'roistat_visit';
              el.value = roistat_visit;
              form.append(el);
        }
      }
	  
      roistat_aded = 1;
    }
 }
	
}, 500);

});

// Admitad
var get_params = window
.location
.search
.replace('?','')
.split('&')
.reduce(
    function(p,e){
      var a = e.split('=');
      p[ decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
      return p;
    },
    {}
);

document.addEventListener('DOMContentLoaded', function() {
	if(get_params['admitad_uid']) {
		let forms = document.getElementsByTagName("form");
		if (forms.length > 0) {
			for (let i = 0; i < forms.length; i++) {
			  let form = forms[i];
			  let el = document.createElement("input");
				  el.type = "hidden";
				  el.name = 'admitad_uid';
				  el.value = get_params['admitad_uid'];
				  form.append(el);
			}
		}

		setCookie('admitad_uid', get_params['admitad_uid'], 90);
	} else if (getCookiesValuesForForms('admitad_uid')) {
		let forms = document.getElementsByTagName("form");
		if (forms.length > 0) {
			for (let i = 0; i < forms.length; i++) {
			  let form = forms[i];
			  let el = document.createElement("input");
				  el.type = "hidden";
				  el.name = 'admitad_uid';
				  el.value = getCookiesValuesForForms('admitad_uid');
				  form.append(el);
			}
		}	
	}
});

// Оферта и персональные данные
document.addEventListener('DOMContentLoaded', function() {
	let pers_blocks = document.getElementsByClassName("confidentiality-pers");
	if(pers_blocks.length > 0) {
		for (let i = 0; i < pers_blocks.length; i++) {
			pers_blocks[i].firstElementChild.setAttribute("name", "confidentiality-pers");
		}
	}

	let oferta_blocks = document.getElementsByClassName("confidentiality-oferta");
	if(oferta_blocks.length > 0) {
		for (let i = 0; i < oferta_blocks.length; i++) {
			oferta_blocks[i].firstElementChild.setAttribute("name", "confidentiality-oferta");
		}
	}
});

// erid
document.addEventListener('DOMContentLoaded', function() {
	if(get_params['erid']) {
		let forms = document.getElementsByTagName("form");
		if (forms.length > 0) {
			for (let i = 0; i < forms.length; i++) {
			  let form = forms[i];
			  let el = document.createElement("input");
				  el.type = "hidden";
				  el.name = 'erid';
				  el.value = get_params['erid'];
				  form.append(el);
			}
		}
	}
});
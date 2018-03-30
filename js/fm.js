window.urlParameters = (function() {
	var urlParams = {};
	var match;
	var search = /([^&=]+)=?([^&]*)/g;
	var plus = /\+/g;
	var decode = function(s) {
		return decodeURIComponent(s.replace(plus, ' '));
	};
	var query = window.location.search.substring(1);
	while (match = search.exec(query)) {
		urlParams[decode(match[1])] = decode(match[2]);
	}
	return function(name) {
		if (arguments.length) return urlParams[name];
		return urlParams;
	};
})();

function initInputs(context) {
	$('.pick-date', context).one('change', function(e) {
		e.stopPropagation(); // Prevent being flagged as invalid on initialisation
	}).datepicker({
		format: 'dd/mm/yyyy',
		todayHighlight: true
	}).each(function() {
		var value = $(this).next();
		if (!value.length) value = $(this).prev();
		$(this).data('input', value)
	}).on('changeDate', function(e) {
		$(this).data('input').val(e.format('yyyy-mm-dd')).change();
	}).change(function() {
		if (!this.value) $(this).data('input').val('').change();
	}).on('hide', function(e) {
		// Prevent hide event being confused with modals
		e.stopPropagation();
	});
	$('.pick-time', context).timepicker({
		//template: false,
		defaultTime: false,
		showInputs: false,
		disableFocus: true,
		disableMousewheel: true
	}).each(function() {
		var value = $(this).next();
		if (!value.length) value = $(this).prev();
		$(this).data('input', value)
	}).change(function() {
		var time = moment(this.value, 'LT');
		$(this).data('input').val(time.isValid() ? time.format('HH:mm:ss') : '').change();
	});
	
	$('[data-provide=typeahead]', context).each(function() {
		var input = $(this);
		var options = input.data();
		options.afterSelect = function(datum) {
			$(options.value).val(datum.value || datum.id).change();
			input.data('display', datum.name).change();
		};
		input.typeahead(options);
		options.display = this.value;
	}).change(function() {
		if (!this.value) {
			$($(this).data('value')).val('null').change();
			$(this).data('display', '');
		}
	});
	
	$('select.group-input', context).each(function() {
		$(this).selectpicker({
			liveSearch: screen.width > 767 && $(this).find('option').length > 10
		});
	});
	
	var texts = $('textarea.edit-input', context).on('input', function() {
		// Note: this doesn't refresh correctly in Edge
		this.rows = 1;
		if (this.scrollHeight) this.rows = this.scrollHeight / 20;
	}).trigger('input');
	
	return context;
}

function togglePrefixes() {
	$('.edit-input-prefix').each(function() {
		$(this).toggle($(this).next('.edit-input').val() !== '');
	});
	$('.edit-input~.input-group-addon').each(function() {
		$(this).toggleClass('edit-show', $(this).prevAll('.edit-input').val() === '');
	});
}

// On demand loading of typeahead source
$.fn.typeahead_orig = $.fn.typeahead;
$.fn.typeahead = function(options) {
	var $this = this;
	if (options.source && (typeof options.source == 'string' || options.source.url)) {
		var ajax, source = options.source;
		options.source = function(query, process) {
			if (!ajax) ajax = $.getJSON(source).done(function(result) {
				$this.data('typeahead').source = result;
			});
			if (process) ajax.done(process);
		}
	}
	var retval = $.fn.typeahead_orig.call(this, options);
	if (options.loadSource == 'focus') this.one('focus', options.source);
	else if (options.loadSource == 'init' && this.length) options.source();
	return retval;
};

// Request a lock when loading a modal via ajax to prevent multiple clicks
function modalLock() {
	if (modalLock.locked) return false;
	return modalLock.locked = true;
}
// Unlock immediately after showing modal
function modalUnlock() {
	modalLock.locked = false;
}

$(function() {
	initInputs();
	
	$('#editButton').click(function() {
		$('body').addClass('editing');
		var inputs = $('.edit-page .edit-input').prop('disabled', false);
		inputs.filter('textarea').trigger('input');
		inputs.filter('.bootstrap-select').children('select').selectpicker('refresh');
		inputs.filter(function() {
			return !this.value && this.required;
		}).first().focus();
	});
	
	$('#saveButton').click(function() {
		$('.edit-page').submit();
	});
	
	$('.edit-page').validator({
		delay: 200
	}).submit(function(e) {
		if (e.isDefaultPrevented()) e.stopImmediatePropagation();
		if (!this.getAttribute('action')) e.preventDefault();
	});

	$('.input-group-collapse').on('show.bs.collapse', function() {
		var input = $(this);
		setTimeout(function() {
			input.width('100%').children('.form-control').focus();
		});
	}).children('.form-control').blur(function() {
		if (!$(this).closest('.input-group').is(':active')) $(this).parent().collapse('hide');
	}).keydown(function(e) {
		if (e.which == 13) $(this).closest('.input-group').find('.btn').click();
	});
	
	$('tr.linker').linker();
	
	$('.link').click(function(e) {
		e.preventDefault();
		window.location = $(this).data('href');
	});
	
	$('.alert[data-autohide]').each(function() {
		var alert = $(this);
		setTimeout(function() {
			alert.slideUp('slow').fadeOut({duration: 'slow', queue: false, complete: function() {
				$(this).remove();
			}});
		}, alert.data('autohide')*1000);
	});
	
	$('body').tooltip({
		container: 'body',
		selector: '[data-toggle=tooltip]'
	});
	
	$('.help-popover').popover({
		placement: 'left',
		html: true,
		trigger: 'manual',
	}).click(function() {
		$(this).popover('toggle');
	});
});

Number.prototype.toFixedWithCommas = function(digits) {
    return this.toFixed(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHtml(text) {
	return text.replace(/[&<>"']/g, function(m) {
		return {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		}[m];
	});
}
function dtAutoPaginate(settings) {
	//if (!settings._iDisplayLengthInitial) settings._iDisplayLengthInitial = settings._iDisplayLength;
	var multiPage = this.api().page.info().recordsTotal > 20;
	$(settings.nTableWrapper).toggleClass('dt-singlepage', !multiPage);
}
function fmDate(date) {
	if (date === '0000-00-00') return '';
	return date.split('-').reverse().join('/');
}
function fmTime(time) {
	var parts = time.split(':');
	var hours = parseInt(parts[0]);
	return ((hours+11)%12+1)+':'+parts[1]+'&nbsp;'+(hours < 12 ? 'AM' : 'PM');
}
function dtRenderDate(data, type) {
	if (type === 'sort') return data;
	if (!data) return '';
	if (data.length === 10) return fmDate(data);
	if (data.length === 8) return fmTime(data);
	var parts = data.split(' ');
	return fmDate(parts[0])+' '+fmTime(parts[1]);
}
function dtRenderCurrency(data, type) {
	if (type == 'sort') return data;
	var money = '$'+Math.abs(data).toFixedWithCommas(2);
	if (data < 0) money = '-'+money;
	return money;
}
$.extend($.fn.DataTable.defaults, {
	stateSave: true,
	pageLength: 20,
	lengthMenu: [10,20,50,100],
	language: {
		search: "_INPUT_",
		searchPlaceholder: "Search",
		lengthMenu: "_MENU_ entries/page"
	}
});
$.fn.dataTable.Api.register('row().show()', function() {
    var page_info = this.table().page.info();
    // Get row index
    var new_row_index = this.index();
    // Row position
    var row_position = this.table().rows()[0].indexOf( new_row_index );
    // Already on right page ?
    if( row_position >= page_info.start && row_position < page_info.end ) {
        // Return row object
        return this;
    }
    // Find page number
    var page_to_display = Math.floor( row_position / this.table().page.len() );
    // Go to that page
    this.table().page( page_to_display );
    // Return row object
    return this;
});

$.fn.datepicker.defaults.autoclose = true;
$.fn.selectpicker.defaults = {iconBase:'fa', tickIcon: 'fa-check', selectedTextFormat: 'count > 2'};
$.fn.timepicker.defaults.icons = {up:'fa fa-chevron-up', down:'fa fa-chevron-down'};

$.fn.validator.Constructor.DEFAULTS.custom = {
	custom: function($el) {
		return window[$el.data('custom')].call(this, $el);
	},
	value: function($el) {
		var valid = !$el.val() || $el.val() == $el.data('display');
		if (!valid) return "This field is required";
	},
	require: function($el) {
		if ($el.val()) return;
		var requireInput = $($el.data('require'));
		var valid;
		if (requireInput.attr('type') == 'checkbox') {
			valid = !requireInput.prop('checked');
		} else {
			valid = !requireInput.val() || requireInput.val() === '0';
		}
		if (!valid) return "This field is required";
	},
	timerange: function($el) {
		var start = $($el.data('timerange')).data('input').val();
		var end = $el.data('input').val();
		var valid = start && start < end;
		if (!valid) return "Invalid time range";
	}
};

$.fn.wysiwyg.defaults.hotKeys = {
    'ctrl+b meta+b': 'bold',
    'ctrl+i meta+i': 'italic',
    'ctrl+u meta+u': 'underline'
};
$.fn.wysiwyg.defaults.activeToolbarClass = 'active';
$.fn.wysiwyg.defaults.selectionColor = '#cacaca';
$.fn.wysiwyg.defaults.dragAndDropImages = false;
$.fn.wysiwyg.cleanHtml = $.fn.cleanHtml;
$.fn.cleanHtml = function() {
	if ($(this).hasClass('placeholderText')) return '';
	// Fixup font sizes
	$(this).find('font[size=1]').removeAttr('size').css({fontSize: '10px'});
	$(this).find('font[size=3]').removeAttr('size').css({fontSize: '14px'});
	$(this).find('font[size=5]').removeAttr('size').css({fontSize: '24px'});
	// Strip some things we don't want, which can happen when pasting from e.g. Word
	$(this).find('[class]').removeAttr('class');
	$(this).find('span').css({fontFamily:'',lineHeight:''}).filter('[style=""],:not([style])').each(function() {
		$(this).replaceWith($(this).html());
	});
	$(this).find(':empty:not(br)').remove();
	return $.fn.wysiwyg.cleanHtml.call(this);
};

bootbox.formDialog = function(options, validation) {
	options.show = false;
	var primary = Object.keys(options.buttons).pop();
	var button = options.buttons[primary];
	if (button instanceof Function) button = options.buttons[primary] = { callback: button };
	if (options.className && !button.className && options.className.indexOf('modal-') == 0) {
		button.className = 'btn-'+options.className.split(' ')[0].split('-')[1];
	}
	var $form = $('<form class="modal-content">');
	if (options.action) $form.attr('action', options.action).attr('method', 'post');
	if (options.enctype) $form.attr('enctype', options.enctype);
	var isValid = false;
	var origCallback = button.callback;
	var $button, $modal;
	button.callback = function() {
		$form.submit();
		if (!isValid) return false;
		var retval = true;
		if (origCallback) {
			// Adhere to enctype only when no action set
			var callbackData;
			if (options.action || !options.enctype) {
				callbackData = $form.serializeJSON();
			} else if (options.enctype == 'application/x-www-form-urlencoded') {
				callbackData = $form.serialize();
			} else if (options.enctype == 'multipart/formdata') {
				callbackData = new FormData($form[0]);
			}
			// Bind callback to the button, allows the callback to set loading text etc.
			retval = origCallback.call($button[0], callbackData);
		}
		if (options.action && retval !== false) $form[0].submit();
		if (retval && retval.then) {
			// Wait for promise
			$button.data('loadingText', 'Submitting&hellip;').button('loading');
			retval.then(function(retval2) {
				if (retval2 !== false) $modal.modal('hide');
				else $button.button('reset');
			});
			return false;
		}
		return retval;
	};
	
	if (!validation) validation = {};
	validation.delay = 300;
	$modal = bootbox.dialog(options).one('show.bs.modal', function() {
		setTimeout(function() {
			$form.validator(validation).submit(function(e) {
				isValid = !e.isDefaultPrevented();
				e.preventDefault();
			});
		}, 300);
	}).one('shown.bs.modal', function() {
		if (!$form.find('[autofocus]').length) $form.find('.modal-body :input').first().focus();
	});
	var $content = $modal.children().children();
	$content.replaceWith($form.append($content.children()));
	$button = $modal.find('.modal-footer .btn').last().prop('type', 'submit');
	initInputs($form);
	return $modal.modal('show');
};

// Override Bootstrap Select's search to match words beginning with
$.expr.pseudos.icontains = function (obj, index, meta) {
	var haystack = obj.textContent.toUpperCase().split(' ');
	var search = meta[3].toUpperCase();
	for (var i=0; i<haystack.length; i++) {
		if (haystack[i].startsWith(search)) return true;
	}
	return obj.textContent.toUpperCase().startsWith(search);
};

$.fn.linker = function(href) {
	return this.each(function() {
		var link = href || this.dataset.href;
		if (link) {
			for (var i=0; i<this.children.length; i++) {
				var child = this.children[i];
				if (child.classList.contains('no-link')) continue;
				var a = document.createElement('a');
				a.href = link;
				child.insertBefore(a, child.firstChild);
			}
			this.classList.add('linker');
			if (!href) delete this.dataset.href;
		}
	});
};

$(document).on('keypress', 'span.edit-input', function(e) {
	if (e.which == 13) e.preventDefault();
}).on('click', '.mailto', function(e) {
	if ($(this).children('.edit-input:disabled').length) {
		window.location.href = '/email?r='+$(this).data('id');
	}
}).on('click', '.tel', function(e) {
	if (screen.width >= 768) return;
	var tel = $(this).children('.edit-input:disabled').val();
	if (tel) {
		e.preventDefault();
		window.location.href = 'tel:'+tel;
	}
}).on('preInit.dt', 'table.dataTable', function(e, settings) {
	// DataTables saves state but we don't to remember the search
	$(this).DataTable().search('');
}).on('click', function(e) {
	// Hide popovers when clicking outside
	$('.popover').each(function() {
		if (!$(e.target).closest($(this).data('bs.popover').$element.add(this)).length) $(this).popover('hide');
	});
}).on('paste', '.wysiwyg', function(e) {
	// Don't allow pasting html
	e.preventDefault();
	var text = e.originalEvent.clipboardData.getData('text/plain');
	document.execCommand('insertText', false, text.replace(/\r/g, ''));
});

(function(){var TERMS={"player":"Player","players":"Players","group":"Group","groups":"Groups","code":"Category","codes":"Categories","staff":"Coach","staffs":"Coaches","term":"Term","terms":"Terms","award":"Award","awards":"Awards","awardgroup":"Award Group","awardgroups":"Award Groups","program":"Holiday Programme","programs":"Holiday Programmes"};window.calData = {};
window.calFetch = null;
window.calFilter = null;

var CONFIRMED = 4;
var DECLINED = -1;
var ATTENDANCE = 1;
var BOOKING = 2;

var cal = $('#calendar');
if ($(window).width() >= 768) {
	var header = {
		left: 'prev,next today',
		center: 'title',
		right: 'month,agendaWeek,listWeek'
	};
} else {
	var header = {
		left: 'prev,next',
		right: 'title'
	};
}

cal.fullCalendar({
	header: header,
	defaultView: $(window).width() >= 768 ? 'month' : 'listWeek',
	eventRender: function(event, element) {
		var title = event.title;
		if (event.link) title = '<a class="fa fa-arrow-circle-right pull-right" href="'+event.link+'"></a><a href="'+event.link+'">'+title+'</a>';
		
		var content = '';
		if (event.eType == ATTENDANCE && !$.isEmptyObject(event.eGroups)) {
			if (Object.keys(event.eGroups).length > 1) {
				content += '<div>'+TERMS.group+':</div>';
				content += '<ul>';
				for (var i in event.eGroups) {
					content += '<li>'+event.eGroups[i]+'</li>';
				}
				content += '</ul>';
			} else {
				var groupID = Object.keys(event.eGroups)[0];
				content += '<div>'+TERMS.group+': '+event.eGroups[groupID]+'</div>';
			}
			content += '<hr>';
		}
		if (event.notes) content += '<div class="ev-notes">'+event.notes+'</div><hr>';
		
		var when = '<b>When:</b> '+event.start.format('D MMM');
		if (!event.allDay) when += event.start.format(', h:mma');
		var end = event.end;
		if (end && event.allDay) end = end.clone().subtract(1, 'd'); // End is exclusive, we want to display inclusive
		var oneDay = event.start.isSame(end, 'day');
		if (end && (!oneDay || !event.allDay)) {
			when += ' - ';
			if (!oneDay) when += end.format('D MMM');
			if (!oneDay && !event.allDay) when += ',';
			if (!event.allDay) when += end.format(' h:mma');
		}
		
		if (event.location)	{
			content += '<p>'+when+'</p>';
			content += '<div><b>Where:</b> '+event.location+'</div>';
		} else {
			content += '<div>'+when+'</div>';
		}
		
		if ('eInvited' in event) content += '<hr>' +
			'<p>You have been invited to attend this event.</p>' +
			'<div>You are: ' +
				'<div class="btn-group btn-group-xs" data-toggle="buttons">' + 
					'<label class="btn btn-success '+(event.eInvited === CONFIRMED ? 'active' : '')+'">' +
						'Attending <input class="ev-attend" type="radio" name="'+event.id+'" value="'+CONFIRMED+'" '+(event.eInvited === CONFIRMED ? 'checked' : '')+'>' +
					'</label>' +
					'<label class="btn btn-danger '+(event.eInvited === DECLINED ? 'active' : '')+'">' +
						'Not Attending <input class="ev-attend" type="radio" name="'+event.id+'" value="'+DECLINED+'" '+(event.eInvited === DECLINED ? 'checked' : '')+'>' +
					'</label>' +
				'</div>' +
			'</div>';
		
		if ('eBooked' in event) content += '<hr>' +
			'<div class="text-center"><button type="button" class="btn btn-xs btn-danger ev-cancel-booking" value="'+event.eBooked+'">Cancel Booking</button></div>';
		
		element.popover({
			title: title,
			content: content,
			html: true,
			placement: 'auto',
			template: '<div class="popover ev-popover"><div class="arrow"></div><h3 class="popover-title '+event.className.join(' ')+'"></h3><div class="popover-content"></div></div>',
			container: '#calendar'
		});
		
		if (event.link) element.on('dblclick', function() {
			if (calData) window.location = event.link;
		});
	}
}).on('change', '.ev-attend', function() {
	$.post('/post/event-actions.json?action=attending', {id:this.name, attending:this.value});
}).on('click', '.ev-cancel-booking', function() {
	var that = this;
	$.post('/post/event-actions.json?action=cancel', {id:this.value}, function(result) {
		if (result) $(that).closest('.popover').data('bs.popover').$element.popover('hide').remove();
	});
});

function calHeight() {
	return Math.max($(window).height() - cal.offset().top - 20, 432);
}

var addedEvents = false;
window.calShow = function() {
	if (!cal.removeClass('hidden').is(':visible')) return;
	cal.fullCalendar('option', 'height', calHeight());
	if (calData && !addedEvents) {
		var filtered;
		cal.fullCalendar('addEventSource', function(start, end, timezone, callback) {
			calData.start = start.format();
			calData.end = end.format();
			calFetch = $.get('/get/events.json', calData, function(events) {
				if (calFilter) {
					if (!filtered) filtered = !cal.fullCalendar('addEventSource', calFilter);
					callback([]);
				} else {
					callback(events);
				}
			});
		});
		addedEvents = true;
	}
}
$(window).resize(calShow);
// Defer initial render, to allow other scripts to modify the calData options
setTimeout(calShow);

$(document).click(function(e) {
	$('.popover').each(function () {
		$el = $(this).data('bs.popover').$element;
		if (!$(e.target).closest($el).length && !$(this).has(e.target).length) {
			$(this).popover('hide').data('bs.popover').inState.click = false;
		}
	});
});
})();
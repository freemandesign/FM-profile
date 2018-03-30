(function(){var TERMS={"player":"Player","players":"Players","group":"Group","groups":"Groups","code":"Category","codes":"Categories","staff":"Coach","staffs":"Coaches","term":"Term","terms":"Terms","award":"Award","awards":"Awards","awardgroup":"Award Group","awardgroups":"Award Groups","program":"Holiday Programme","programs":"Holiday Programmes"};var personID = $('#profileForm').data('id') || null;

var cutoff = $('#dob').data('cutoff');
if (cutoff) cutoff = moment(cutoff);
$('.date-to-now').change(function() {
	if (this.value && this.value != '0000-00-00') {
		var date = moment(this.value);
		var toNow;
		if (this.id == 'dob') {
			toNow = moment().diff(date, 'years');
			var cutAge = toNow;
			if (cutoff) {
				cutAge = cutoff.diff(date, 'years');
				var label = $('#dob-years').parent().tooltip('destroy');
			}
			if (cutAge == toNow) {
				toNow += ' years';
			} else {
				label.tooltip({
					html: true,
					title: "Current age: "+toNow+"<br>Age as at "+cutoff.format('Do MMM')+": "+cutAge
				});
				toNow += ' ('+cutAge+')&ensp;<i class="fa fa-info-circle text-primary"></i>';
			}
		} else if (this.id == 'memberend') {
			if (moment().startOf('day').isAfter(date)) toNow = '<span class="text-danger">Expired</span>';
			else toNow = 'Ends '+date.endOf('day').fromNow();
		} else {
			toNow = date.toNow(true);
		}
		$('#'+this.id+'-years').html(toNow).parent().show();
	} else {
		$('#'+this.id+'-years').empty();
	}
}).change();

$('#editButton').click(function() {
	$('.profile-image').removeClass('disabled');
});
$('#profileImage').change(function() {
	$(this).prev().remove();
	var url = URL.createObjectURL(this.files[0]);
	$(this).parent().css('background-image', "url('"+url+"')").removeClass('no-image');
});

$('#relatedComms').click(function() {
	$.post('/post/person-actions.json?action=comms', {id: personID, relatedComms: this.checked ? 1 : 0});
});

$(function() {
	var player = urlParameters('player');
	$('.edit-page').submit(function() {
		$('#saveButton').button('loading');
		var data = new FormData($('#profileForm')[0]);
		if (personID) data.append('id', personID);
		var pic = $('#profileImage')[0];
		if (pic && pic.files[0]) data.append('profile', pic.files[0]);
		$.ajax({
			url: '/post/person.json',
			type: 'post',
			data: data,
			processData: false,
			contentType: false,
			success: function(response) {
				if (response.error) {
					$('#saveButton').button('reset');
					if (response.nso) {
						var message = "<p>"+response.error+" You may request this person's permission to connect their profile to this club.</p>";
						message += '<input class="form-control" name="reason" placeholder="Reason for request to connect profile" required>';
						bootbox.formDialog({
							className: 'modal-warning',
							title: "Existing email address",
							message: message,
							buttons: {
								Cancel: {},
								'Send Request': function(data) {
									return $.post('/post/nso-request.json', {id:response.nso, reason:data.reason}, function(result) {
										if (result.error) {
											bootbox.alert({
												className: 'modal-danger',
												title: "Sorry, the request could not be sent",
												message: result.error
											});
										} else {
											bootbox.alert({
												className: 'modal-info',
												title: 'Request Sent',
												message: "You will be notified of the person's response."
											});
										}
									});
								}
							}
						});
					} else {
						bootbox.alert({
							className: 'modal-danger',
							title: 'Sorry, there was a problem saving the data',
							message: response.error
						});
					}
				} else if (player) {
					window.location = '/groups/'+player+'?addPlayer='+response;
				} else if (!personID || $('.save-refresh').length) {
					// Refresh if the person or any contacts are new
					window.location = '/people/'+response;
				} else {
					$('#saveButton').button('reset');
					$('body').removeClass('editing');
					$('.edit-page .edit-input').prop('disabled', true)
						.filter('.selectpicker').selectpicker('refresh');
					$('.profile-image').addClass('disabled');
					if (!$('.email-invalid').length) $('.invalid-email-warning').slideUp();
				}
			}
		});
	});
	if (!personID || urlParameters('edit')) $('#editButton').click();
});

// Custom validator function for contact email address
window.contactEmailValid = function($el) {
	if ($el.val()) return;
	var valid = !$el.closest('.contact').find('.contact-login').prop('checked');
	if (!valid) return "Email address is required for login";
}


if ($('#profileForm').data('manage')) {
	var tagspromise;
	$('#person-tags').tagsinput({
		trimValue: true,
		typeahead: {
			source: function() {
				if (!tagspromise) tagspromise = $.get('/get/tags.json');
				return tagspromise;
			},
			afterSelect: function() {
				this.$element.val('');
			},
			showHintOnFocus: true,
			autoSelect: false
		}
	});
	// Tab doesn't work with showHintOnFocus, need to workaround...
	$('#person-tags').tagsinput('input').keydown(function(e) {
		if (e.which == 9) {
			var e = $.Event('keypress', {which:13})
			tags[0].$input.trigger(e);
		}
	});
	
	if (!personID) $('#firstName,#lastName').change(function() {
		var firstName = $('#firstName').val();
		var lastName = $('#lastName').val();
		$('.person-match').remove();
		if (firstName && lastName) {
			$.get('/get/person-match.json', {firstName:firstName, lastName:lastName}, function(result) {
				if (result) {
					var personMatch = $('<div class="person-match text-warning">').append("Note: A profile for <b><a href='/people/"+result+"'>"+firstName+' '+lastName+"</a></b> already exists.");
					$('#firstName').closest('td').append(personMatch);
				}
			});
		}
	});
	
	$('#deleteButton').click(function() {
		bootbox.dialog({
			title: "Are you sure you want to delete this person?",
			message: "All associated fees and transactions will also be deleted. All references to this person will be removed from your system.",
			className: 'modal-danger',
			buttons: {
				Cancel: {},
				Delete: {
					className: 'btn-danger',
					callback: function() {
						$.post('/post/manage-person.json?action=delete', {id:personID}, function() {
							window.location = '/people';
						});
					}
				}
			}
		});
	});
	
	$('.archive-person').click(function() {
		var resignDate = $('#memberend').val() || '';
		var resignFormat = $('#memberend').prev().val() || '';
		var role = +$('#role').val();
		var disableLogin = role == 1 ? '' : 'checked';
		var loginMessage = '';
		if (role && disableLogin) {
			loginMessage = "The user's login will be revoked.";
		} else if (role) {
			loginMessage = "The user will retain their login and may re-register at any time.";
		}
		var message = '<p>This person will no longer be accessible from most places but can be re-activated from the Archived page. Any recurring fees for this person will be stopped.</p>\
				<p>'+loginMessage+'</p>\
				<div class="form-inline">\
					<label class="control-label">Resignation Date:</label>&nbsp;\
					<input class="form-control pick-date" value="'+resignFormat+'" placeholder="optional">\
					<input type="date" class="form-control date-value" value="'+resignDate+'" name="resignDate" autofocus>\
				</div>\
				<input type="checkbox" class="hidden" name="disable" '+disableLogin+'>';
		if ($('.contact').length) {
			message += '<div class="checkbox">\
							<label><input type="checkbox" name="contacts" checked> Also archive contacts who are not members/staff and have no other connections</label>\
						</div>';
		}
		if ($('#totalOutstanding').hasClass('text-danger')) {
			var outstanding = $('#totalOutstanding').text().split(' ')[1];
			message += '<br><b class="text-danger">Outstanding Fees: '+outstanding+'</b>';
		}
		bootbox.formDialog({
			title: "Are you sure you want to archive this person?",
			message: message,
			className: 'modal-warning',
			buttons: {
				Cancel: {},
				Archive: {
					className: 'btn-warning',
					callback: function(data) {
						data.id = personID;
						$.post('/post/manage-person.json?action=archive', data, function() {
							window.location = '/people';
						});
					}
				}
			}
		});
	});
	
	var resetPassword = function(button) {
		button.prop('disabled', true);
		$.post('/post/manage-person.json?action=resetPassword', {id:personID}, function(sent) {
			if (sent) button.text('Password Emailed');
		});
	}
	
	$('.reset-password').click(function() {
		var button = $(this);
		var name = $('#firstName').val();
		if (button.hasClass('first-time')) return resetPassword(button);
		bootbox.confirm({
			title: "Are you sure you want to reset the password for "+name+"?",
			message: "<p>"+name+" will be assigned a temporary password which will be emailed to them.</p>If they do not receive the email, please <b>check that the email address is correct</b> and try again.",
			callback: function(result) {
				if (result) resetPassword(button);
			}
		});
	});
	
	$('.email-invalid').one('change', function() {
		$(this).removeClass('email-invalid').find('.fa-warning').remove();
	}).find('.fa').tooltip({
		html: true,
		title: 'This email address<br>has caused errors.'
	});
	
	var contactTemplate = $('.contacts-holder').children().first().detach();
	contactTemplate.find('.edit-input').prop('disabled', false);
	var contactCount = 0;
	$('#addContact').click(function() {
		contactCount--;
		$('#player-contacts').removeClass('edit-show');
		var contact = contactTemplate.clone().appendTo('.contacts-holder');
		// First contact should default to primary
		if ($('.contact').length == 1) contact.find('.contact-type').val('primary');
		contact.find('.edit-input').each(function() {
			this.name = this.name.replace('[]', '['+contactCount+']');
		}).first().focus();
		contact[0].scrollIntoView();
	});
	
	$('#existingContact').typeahead({
		source: '/get/search.json',
		loadSource: 'focus',
		afterSelect: function(datum) {
			this.$element.val('');
			$.get('/get/contact?id='+datum.id, function(result) {
				$('#player-contacts').removeClass('edit-show');
				var contact = contactTemplate.clone().appendTo('.contacts-holder');
				contact.find('.table').replaceWith(result);
				$('#editButton').click();
				if ($('.contact').length == 1) contact.find('.contact-type').val('primary');
				contact.find('.contact-relationship').focus();
				contact[0].scrollIntoView();
			});
		}
	});
	
	$('.custom-typeahead').each(function() {
		var input = $(this).typeahead({
			source: '/get/custom-values.json?field='+$(this).data('field'),
			loadSource: 'focus',
			afterSelect: function(datum) {
				input.data('display', datum).change();
			}
		});
	}).change(function() {
		var input = $(this);
		if (this.value) setTimeout(function() {
			input.val(input.data('display'));
		}, 300);
	});
	
	$('.select-linked').change(function() {
		var nextSelect = $(this).closest('tr').next().find('.select-linked');
		if (nextSelect.length) {
			nextSelect.hide().empty().append('<option selected disabled>').change();
			var data = {
				field: nextSelect.data('field'),
				option: $(this).find(':selected').data('option')
			};
			$.getJSON('/get/custom-values', data, function(result) {
				$.each(result, function(id, value) {
					$('<option>').text(value)
						.data('option', id)
						.appendTo(nextSelect);
				});
				if (!$.isEmptyObject(result)) nextSelect.show().focus();
			});
		}
	});
	
	$('#player-contacts').on('click', '.remove-contact', function() {
		$(this).closest('.contact').slideUp('fast', function() {
			$(this).remove();
			if (!$('.contact').length) $('#player-contacts').addClass('edit-show');
		});
	}).on('change', '.contact-type', function() {
		if (this.value == 'primary') {
			$('.contact-type').not(this).has('[value=primary]:selected').val('').change();
		}
		var emails = $(this).closest('.contact').find('.contact-emails').toggle(this.value != 'ec');
		if (this.value == 'ec') emails.find(':checkbox').prop('checked', false);
		var labelHolder = $(this).next('.edit-static').empty();
		if (this.value) {
			var type = this.value == 'ec' ? 'success' : 'primary';
			$('<span class="label label-'+type+'">').text($(this).find(':selected').text()).appendTo(labelHolder);
		}
	});
}
if (!personID) return;
$('#createCAward').click(function() {
	if (!modalLock()) return;
	$.get('/get/award-create', {id:personID}, function(result) {
		if (!result) return bootbox.alert({
			className: 'modal-warning',
			message: "No "+TERMS.awardgroups.toLowerCase()+" applicable to create "+TERMS.awards.toLowerCase()+" for this person.",
			buttons: {
				ok: {
					className: 'btn-warning'
				}
			}
		});
		var modal = bootbox.formDialog({
			title: "Create "+TERMS.award,
			message: result,
			enctype: 'multipart/formdata',
			buttons: {
				Cancel: {},
				Create: function(data) {
					return $.post({
						url: '/post/award-create.json',
						data: data,
						contentType: false,
						processData: false
					}).then(function(result) {
						window.location.reload();
					});
				}
			}
		});
		modal.find('.image-input').change(function() {
			$(this).prev().text(this.files[0].name);
		});
		
		modalUnlock();
	});
});

$('.delete-awardperson').click(function() {
	var that = this;
	bootbox.dialog({
		className: 'modal-danger',
		message: "Are you sure you want to delete this "+TERMS.award.toLowerCase()+"?",
		buttons: {
			Cancel: {},
			Delete: {
				className: 'btn-danger',
				callback: function() {
					$.post('/post/award.json?action=delete', {id:that.value}, function() {
						$(that).closest('.award-col').slideUp(function() {
							$(that).remove();
						});
					});
				}
			}
		}
	});
});

$('#assignAward').click(function() {
	if (!modalLock()) return;
	$.get('/get/award-assign', {id:personID}, function(result) {
		if (!result) return bootbox.alert({
			className: 'modal-warning',
			message: "No "+TERMS.awards.toLowerCase()+" available to assign to this person.",
			buttons: {
				ok: {
					className: 'btn-warning'
				}
			}
		});
		var modal = bootbox.formDialog({
			title: "Assign "+TERMS.award,
			message: result,
			buttons: {
				Cancel: {},
				Assign: function(data) {
					return $.post('/post/award.json', data, function() {
						window.location.reload();
					});
				}
			}
		});
		
		var selectAGroup = modal.find('.select-agroup');
		var selectAllGroups = selectAGroup.clone();
		selectAGroup.find(':disabled').remove().end().find('optgroup:empty').remove();
		
		$('#show-all-awards').click(function() {
			selectAGroup.fadeOut('fast', function() {
				$(this).empty().append(selectAllGroups.children()).change().find(':disabled').prop('disabled', false);
			}).fadeIn('fast');
			$(this).remove();
		});
		
		var help = modal.find('.small');
		var selectAward = modal.find('.select-award').change(function() {
			var opt = $(this).find(':selected');
			help.text(opt.data('description'));
			var awarded = opt.data('awarded');
			if (awarded > 0) $('<div class="text-warning">').text('Already awarded: '+awarded).appendTo(help);
			$(this).closest('.form-group').removeClass('has-error');
		});
		var awards = selectAward.children('optgroup').detach();
		selectAGroup.change(function() {
			selectAward.val('').children(':gt(0)').remove();
			awards.filter('[data-id="'+this.value+'"]').children().clone().appendTo(selectAward);
			if ($(this).find('optgroup>:selected').length) {
				$('<option>').val(0-this.value).text('- Promote only -').appendTo(selectAward);
			}
			help.text('');
		}).change();
		
		modalUnlock();
	});
});
var renderFeeName = function(data, type, row) {
	if (type != 'display') return data;
	if (!row.notes) return '<span>'+data+'</span>';
	return $('<span>', {
		'data-toggle': 'tooltip',
		'data-placement': 'right',
		'data-html': true,
		title: row.notes
	}).text(data)
	  .append(' &nbsp;<i class="fa fa-info-circle text-primary hidden-xs"></i>')
	  .prop('outerHTML');
};

// Load data initially but use pageLength:0 to defer initial render until Fees tab is shown
var feesTable = $('#feesTable').DataTable({
	ajax: '/get/person-fees.json?id='+personID,
	drawCallback: dtAutoPaginate,
	pageLength: 0,
	deferRender: true,
	stateSave: false,
	order: [3, 'desc'],
	columns: [
		{
			className: 'hidden-xs',
			orderable: false,
			render: function(data, type, row) {
				return row.transactions ? '<i class="toggle-row fa fa-caret-right fa-fw"></i>' : '';
			}
		},
		{ data: 'name', className: 'top-left', render: renderFeeName },
		{
			data: 'date',
			className: 'hidden-xs',
			render: function(data, type, row) {
				var date = dtRenderDate(data, type);
				if (row.recur && type == 'display') {
					var recur = fmDate(row.recur.date);
					if (parseFloat(row.recur.amount)) recur += ' for $'+row.recur.amount;
					date += ' &nbsp;<i class="fa fa-refresh text-primary" title="Recurs on '+recur+'" data-toggle="tooltip"></i>';
				}
				return date;
			}
		},
		{ data: 'dueDate', className: 'bottom-left', render: dtRenderDate },
		{ defaultContent: '', orderable: false, className: 'cell-divider' },
		{ data: 'amount', className: 'text-right top-right', render: dtRenderCurrency },
		{ data: 'paid', className: 'text-right hidden-xs hidden-sm', render: dtRenderCurrency },
		{ data: 'outstanding', className: 'text-right bottom-right' },
		{
			data: 'id',
			className: 'hidden-xs col-fee-emailed',
			orderable: false,
			render: function(data, type, row) {
				if (type != 'display') return '';
				var view = '';
				if (row.invoiced) {
					view = ' &ensp;<span class="fee-email fee-emailed" data-toggle="tooltip" title="Invoice has been emailed"><i class="fa fa-lg fa-envelope"></i><i class="fa fa-check"></i></span>';
				} else if ('invoiced' in row) {
					view = ' &ensp;<span class="fee-email" data-toggle="tooltip" title="Email Invoice"><i class="fa fa-lg fa-envelope"></i></span>';
				}
				return '<a class="view-invoice" href="/get/invoice?id='+data+'" target="_blank" title="View Invoice" data-toggle="tooltip"><i class="fa fa-file-pdf-o"></i></a>'+view;
			}
		}
	],
	createdRow: function(row, data) {
		if (data.transactions) {
			var child = $('#childRow>tbody>tr').clone();
			data.transactions.forEach(function(t) {
				var tr = $('<tr id="t'+t.id+'">').appendTo(child.find('tbody'));
				if (t.status == -1) tr.addClass('transaction-scheduled');
				else if (t.status == 2) tr.addClass('transaction-pending');
				else if (t.status < 0) tr.addClass('transaction-failed');
				delete t.id;
				delete t.status;
				$.each(t, function(key, value) {
					var td = $('<td>').html(value).appendTo(tr);
					if (key == 'amount') td.addClass('t-amount');
				});
			});
			feesTable.row(row).child(child);
			$(row).addClass('has-transactions');
		}
		$(row).addClass('parent-row');
		if (data.amount < 0) $(row).addClass('fee-credit');
	}
}).on('xhr.dt', function(e, settings, data) {
	var outstanding = data.fees - data.paid;
	$('#totalOutstanding').text('Outstanding: '+dtRenderCurrency(outstanding)).toggleClass('text-danger', outstanding>0);
	$('#custom-buttons .pay-fees').toggle(outstanding>0);
	$('#totalPaid').text('Total Paid: '+dtRenderCurrency(data.paid));
	$('#totalCredit').text('Credit: '+dtRenderCurrency(data.credit)).toggleClass('text-success', data.credit>0);
});

$('#feesTab').one('show.bs.tab', function() {
	feesTable.page.len(20).draw();
	
	var creditTable = $('.dt-panel #creditsTable').DataTable({
		ajax: '/get/credits.json?id='+personID,
		drawCallback: dtAutoPaginate,
		stateSave: false,
		order: [1, 'desc'],
		columns: [
			{ data: 'name', className: 'hidden-xs', render: renderFeeName },
			{ data: 'date', render: dtRenderDate },
			{ data: 'amount', className: 'text-right', render: dtRenderCurrency },
			{
				data: 'paid',
				className: 'text-right hidden-xs',
				render: function(data, type) {
					if (!data && type == 'display') return '-';
					return dtRenderCurrency(data, type);
				}
			}
		]
	});
	
	feesTable.on('click', '.has-transactions', function(e) {
		if ($(e.target).closest('a,button', this).length) return; // Don't toggle if clicking a link
		var row = feesTable.row(this);
		var holder = $(row.child()).find('.payments-holder');
		if (row.child.isShown()) {
			holder.slideUp('fast', function() {
				row.child.hide();
			});
			$(this).removeClass('expanded')
				.find('.toggle-row').addClass('fa-caret-right').removeClass('fa-caret-down');
		} else {
			row.child.show();
			holder.slideDown('fast');
			$(this).addClass('expanded')
				.find('.toggle-row').addClass('fa-caret-down').removeClass('fa-caret-right');
		}
	}).on('click', '.make-payment', function() {
		var row = feesTable.row($(this).closest('tr'));
		window.payFees({fee:this.value}).done(function(result) {
			addedTransaction(row.index(), result[0].id);
		});
	});
	
	function addedTransaction(rowIndex, id) {
		feesTable.ajax.reload(function(json) {
			feesTable.row(rowIndex).nodes().to$().click();
			var rows = $('#t'+id).addClass('new-row');
			setTimeout(function() {
				rows.addClass('old-row').removeClass('new-row');
			}, 3000);
		}, false);
	}

	feesTable.on('click', '.add-transaction', function(e) {
		e.stopPropagation();
		var row = feesTable.row($(this).closest('tr'));
		addTransaction(this.value).done(function(transaction) {
			addedTransaction(row.index(), transaction.id);
		});
	}).on('click', '.fee-email', function(e) {
		e.stopPropagation();
		if (!modalLock()) return;
		var row = feesTable.row($(this).closest('tr'));
		var data = row.data();
		$.get('/get/email-fees', {id:data.id}, function(result) {
			var modal = bootbox.dialog({
				title: "Email Invoice",
				message: result,
				className: 'modal-primary',
				buttons: {
					Cancel: {},
					Send: function() {
						modal.find('.btn-primary').prop('disabled', true).html('Sending&hellip;');
						var postdata = {
							message: $('#invoice-intro').cleanHtml(),
							fees: data.id
						};
						$.post('/post/email-fees.json', postdata, function(result) {
							modal.modal('hide');
							if (!result[data.id]) return bootbox.alert({
								title: "Invoice Not Sent",
								message: "No suitable recipients were found. Please check email addresses and try again.",
								className: 'modal-danger'
							});
							rowData.invoiced = true;
							row.data(data).draw();
						});
						return false;
					}
				}
			});
			modalUnlock();
		});
	});
	
	$('.statement-email').click(function() {
		var defaultType = $(this).data('default');
		var altType = defaultType == 'Outstanding' ? 'Overdue' : 'Outstanding';
		bootbox.dialog({
			message: "Email current statement for <b>"+$('#profileForm').data('name')+"</b>?",
			className: 'modal-primary',
			buttons: {
				Cancel: {
					className: 'btn-default pull-left'
				},
				alt: {
					label: 'Send '+altType+' Statement',
					className: 'btn-info',
					callback: function() {
						sendStatement(altType);
					}
				},
				default: {
					label: 'Send '+defaultType+' Statement',
					className: 'btn-primary',
					callback: function() {
						sendStatement(defaultType);
					}
				}
			}
		});
	});
	function sendStatement(type) {
		$.post('/post/email-statements.json', {type:type.toLowerCase(), id:personID}, function(result) {
			if (!result[personID]) bootbox.alert({
				title: "Statement Not Sent",
				message: "No suitable recipients were found. Please check email addresses and try again.",
				className: 'modal-danger'
			});
		});
	}
	
	$('.add-credit').click(function() {
		addTransaction().done(function(transaction) {
			creditTable.row.add({
				name: transaction.notes,
				date: transaction.date,
				amount: transaction.amount,
				paid: 0
			}).draw();
			feesTable.ajax.reload();
		});
	});
	
	function addTransaction(feeID) {
		var deferred = $.Deferred();
		if (modalLock()) $.get('/get/transaction', {person:personID, fee:feeID}, function(modal) {
			$(modal).modal().on('fm.transactionsaved fm.paymentcomplete', function(e, result) {
				deferred.resolve(result[0]);
			});
			modalUnlock();
		});
		return deferred.promise();
	}
});
if (window.calData) window.calData.person = personID;
$('#eventsTab,#dashboardEvents').one('shown.bs.tab', window.calShow);
$('#attendanceTab').one('show.bs.tab', function() {
	$('#profile-attendance').DataTable({
		ajax: '/get/person-attendance.json?id='+personID,
		drawCallback: dtAutoPaginate,
		order: [1, 'desc'],
		columns: [
			{ data: 'name' },
			{ data: 'date', render: dtRenderDate },
			{ data: 'note' }
		],
		createdRow: function(row, data) {
			$(row.children[0]).addClass('dash-ev dash-'+data.type);
		}
	});
});
$('.select-group-item').click(function(e) {
	e.preventDefault();
	if ($(this).hasClass('disabled')) return e.stopPropagation();
	var group = $(this).data('group');
	var term = $(this).data('term');
	var name = term ? $(this).closest('.dropdown-menu').prev('a').text() : $(this).text();
	$.get('/get/group-add-person', {
		id: group,
		term: term,
		person: personID,
		hidePerson: true
	}).done(function(result) {
		bootbox.formDialog({
			title: "Add to "+TERMS.group+": "+name,
			message: result,
			buttons: {
				Cancel: {},
				Add: function(data) {
					$.post('/post/manage-person.json?action=addGroup', data).done(function() {
						window.location.reload();
					});
				}
			}
		}).on('shown.bs.modal', function() {
			$('#addPersonPosition').focus();
		});
	});
});

$('.remove-group-item').click(function() {
	var button = $(this);
	var groupName = button.closest('tr').children().first().text();
	var message = "Are you sure you want to remove this person from "+groupName+"?";
	if (button.data('fee')) {
		message += "<br>Any recurring membership fees for this "+TERMS.group.toLowerCase()+" will be stopped.";
	}
	bootbox.confirm({
		title: "Remove From "+TERMS.group,
		message: message,
		className: 'modal-danger',
		buttons: {
			confirm: {
				label: 'Remove',
				className: 'btn-danger'
			}
		},
		callback: function(result) {
			if (result) {
				var row = button.tooltip('hide').off('click').closest('tr');
				var data = {
					id: personID,
					group: button.data('group'),
					term: button.data('term')
				};
				$.post('/post/manage-person.json?action=removeGroup', data, function() {
					if (row.hasClass('success') || !data.term) $('#player-'+data.group).remove(); // Remove from profile if current term
					row.remove();
					$('#g_'+data.group+'-'+data.term).removeClass('disabled'); // Enable item in add menu
				});
			}
		}
	});
});

$('.cancel-sub').click(function() {
	var feeID = this.value;
	bootbox.confirm({
		title: "Are you sure you want to cancel this subscription?",
		message: "You will not receive any futher fees for this subscription.",
		className: 'modal-danger',
		buttons: {
			confirm: {
				label: 'Cancel Subscription',
				className: 'btn-danger'
			}
		},
		callback: function(result) {
			if (result) $.post('/post/person-actions.json?action=cancelSub', {id:personID, feeID:feeID}, function(cancelled) {
				if (cancelled) window.location.reload();
			});
		}
	});
});

$('.select-booking').change(function() {
	var panel = $(this).closest('.panel');
	panel.find('.remove-program').prop('disabled', !panel.find('.select-booking:checked').length);
});

$('.remove-program').click(function(e) {
	e.stopPropagation();
	var inputs = $(this).closest('.panel').find('.select-booking:checked');
	$.get('/get/program-delete-attendee', {programID:this.value, personID:personID}, function(result) {
		var title = inputs.length == 1 ? "the selected booking?" : inputs.length+" selected bookings?";
		var modal = bootbox.dialog({
			title: "Are you sure you want to remove "+title,
			className: 'modal-danger',
			message: result,
			buttons: {
				Cancel: {},
				Remove: {
					className: 'btn-danger',
					callback: function() {
						var data = inputs.serializeJSON();
						if (modal.find('#applyRefund').prop('checked')) data.refund = modal.find('#refundAmount').val();
						$.post('/post/program.json?action=removePerson', data, function() {
							window.location.hash = 'membership';
							window.location.reload();
						});
					}
				}
			}
		});
	});
});

$('.tab-button').each(function() {
	$('#custom-buttons').append(' ').append(this);
})

$('.nav-hash a').on('shown.bs.tab', function(e) {
	$('.edit-controls,#deleteButton').toggleClass('hidden', this.hash != '#profile');
	$('.tab-button').toggleClass('hidden', true);
	$('.tab-button-'+this.hash.substr(1)).toggleClass('hidden', false);
});

$('.nav-hash a').on('show.bs.tab', function(e) {
	$(history.replaceState.bind(history, null, document.title, this.hash));
}).filter(':first, [href="'+location.hash+'"]').last().tab('show');
if (location.hash) location.hash = ''; // Prevent jump
})();
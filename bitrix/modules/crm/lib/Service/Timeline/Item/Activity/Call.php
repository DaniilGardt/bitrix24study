<?php

namespace Bitrix\Crm\Service\Timeline\Item\Activity;

use Bitrix\Crm\Activity\StatisticsMark;
use Bitrix\Crm\Badge\Badge;
use Bitrix\Crm\Badge\SourceIdentifier;
use Bitrix\Crm\Badge\Type\AiCallFieldsFillingResult;
use Bitrix\Crm\Copilot\AiQualityAssessment\Controller\AiQualityAssessmentController;
use Bitrix\Crm\Copilot\CallAssessment\ItemFactory;
use Bitrix\Crm\Format\Duration;
use Bitrix\Crm\Integration\AI\AIManager;
use Bitrix\Crm\Integration\AI\Operation\OperationState;
use Bitrix\Crm\Integration\VoxImplantManager;
use Bitrix\Crm\Service\Container;
use Bitrix\Crm\Service\Timeline\Item\Activity;
use Bitrix\Crm\Service\Timeline\Item\Mixin\CopilotButtonTrait;
use Bitrix\Crm\Service\Timeline\Item\Payload;
use Bitrix\Crm\Service\Timeline\Layout;
use Bitrix\Crm\Service\Timeline\Layout\Action\JsEvent;
use Bitrix\Crm\Service\Timeline\Layout\Action\Redirect;
use Bitrix\Crm\Service\Timeline\Layout\Action\ShowMenu;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\Audio;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\Client;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\ClientMark;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\ContentBlockFactory;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\ContentBlockWithTitle;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\Copilot\CallScoringPill;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\LineOfTextBlocks;
use Bitrix\Crm\Service\Timeline\Layout\Body\ContentBlock\Text;
use Bitrix\Crm\Service\Timeline\Layout\Common\Icon;
use Bitrix\Crm\Service\Timeline\Layout\Footer\Button;
use Bitrix\Crm\Service\Timeline\Layout\Footer\IconButton;
use Bitrix\Crm\Service\Timeline\Layout\Header\Tag;
use Bitrix\Crm\Service\Timeline\Layout\Menu;
use Bitrix\Crm\Service\Timeline\Layout\Menu\MenuItemFactory;
use Bitrix\Crm\Tour\CopilotInCall;
use Bitrix\Crm\Tour\CopilotRunAutomatically;
use Bitrix\Crm\Tour\CopilotRunManually;
use Bitrix\Main\Config\Option;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\PhoneNumber;
use Bitrix\Main\Type\DateTime;
use Bitrix\Main\Web\Uri;
use CCrmActivityDirection;
use CCrmDateTimeHelper;
use CCrmFieldMulti;
use CCrmOwnerType;
use CFile;

class Call extends Activity
{
	use CopilotButtonTrait;

	private const BLOCK_DELIMITER = '&bull;';

	final protected function getActivityTypeId(): string
	{
		return 'Call';
	}

	public function getIconCode(): ?string
	{
		switch ($this->fetchDirection())
		{
			case CCrmActivityDirection::Incoming:
				if ($this->isMissedCall())
				{
					return Icon::CALL_INCOMING_MISSED;
				}

				return $this->isScheduled() ? Icon::CALL_INCOMING : Icon::CALL_COMPLETED;
			case CCrmActivityDirection::Outgoing:
				return Icon::CALL_OUTCOMING;
		}

		return Icon::CALL;
	}

	public function getTitle(): string
	{
		switch ($this->fetchDirection())
		{
			case CCrmActivityDirection::Incoming:
				if ($this->isMissedCall())
				{
					return Loc::getMessage(
						$this->isScheduled()
							? 'CRM_TIMELINE_TITLE_CALL_MISSED'
							: 'CRM_TIMELINE_TITLE_CALL_INCOMING_DONE'
					);
				}

				// set call end time to correct title in header
				if ($this->isScheduled())
				{
					$userTime = (string)$this->getAssociatedEntityModel()?->get('END_TIME');
					if (!empty($userTime) && !CCrmDateTimeHelper::IsMaxDatabaseDate($userTime))
					{
						$this->getModel()->setDate(DateTime::createFromUserTime($userTime));
					}
				}

				$scheduledCode = $this->isPlanned()
					? 'CRM_TIMELINE_TITLE_CALL_INCOMING_PLAN'
					: 'CRM_TIMELINE_TITLE_CALL_INCOMING';

				return Loc::getMessage($this->isScheduled() ? $scheduledCode : 'CRM_TIMELINE_TITLE_CALL_INCOMING_DONE');
			case CCrmActivityDirection::Outgoing:
				return Loc::getMessage(
					$this->isPlanned()
						? 'CRM_TIMELINE_TITLE_CALL_OUTGOING_PLAN'
						: 'CRM_TIMELINE_TITLE_CALL_OUTGOING'
				);
		}

		return Loc::getMessage('CRM_TIMELINE_CALL_TITLE_DEFAULT');
	}

	public function getLogo(): ?Layout\Body\Logo
	{
		$recordUrls = array_unique(array_column($this->fetchAudioRecordList(), 'VIEW_URL'));
		$isAudioExist = !empty($recordUrls);

		$changePlayerStateAction = (new JsEvent('Call:ChangePlayerState'))
			->addActionParamInt('recordId', $this->getAssociatedEntityModel()?->get('ID'))
			->addActionParamString('recordUri', $isAudioExist ? (string)$recordUrls[0] : null)
		;

		switch ($this->fetchDirection())
		{
			case CCrmActivityDirection::Incoming:
				if ($this->isMissedCall())
				{
					return $isAudioExist
						? (Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_PLAY_RECORD))
							->createLogo()
							?->setAction($changePlayerStateAction)
						: Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_DEFAULT)
							->createLogo()
							?->setIconType(Layout\Body\Logo::ICON_TYPE_FAILURE)
							->setAdditionalIconType(Layout\Body\Logo::ICON_TYPE_FAILURE)
							->setAdditionalIconCode('arrow')
					;
				}

				return $isAudioExist
					? Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_PLAY_RECORD)
						->createLogo()
						?->setAction($changePlayerStateAction)
					: Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_INCOMING)
						->createLogo()
				;

			case CCrmActivityDirection::Outgoing:
				$logo = $isAudioExist
					? Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_PLAY_RECORD)
						->createLogo()?->setAction($changePlayerStateAction)
					: Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_OUTGOING)
						->createLogo()
				;

				if (!$this->isPlanned() && !$this->fetchInfo()['SUCCESSFUL'])
				{
					$logo
						?->setAdditionalIconType(Layout\Body\Logo::ICON_TYPE_FAILURE)
						?->setAdditionalIconCode('cross')
					;
				}

				return $logo;
		}

		return  Layout\Common\Logo::getInstance(Layout\Common\Logo::CALL_DEFAULT)
			->createLogo();
	}

	public function getContentBlocks(): array
	{
		$result = [];

		if ($this->isPlanned() && $this->getDeadline())
		{
			$deadline = $this->getDeadline();
			$updateDeadlineAction = null;
			if ($this->isScheduled())
			{
				$updateDeadlineAction = $this->getChangeDeadlineAction();
			}

			$result['deadline'] = (new ContentBlockWithTitle())
				->setTitle(Loc::getMessage('CRM_TIMELINE_ITEM_CALL_COMPLETE_TO'))
				->setInline()
				->setContentBlock(
					(new ContentBlock\EditableDate())
						->setStyle(ContentBlock\EditableDate::STYLE_PILL)
						->setDate($deadline)
						->setAction($updateDeadlineAction)
						->setBackgroundColor($this->isScheduled() ? ContentBlock\EditableDate::BACKGROUND_COLOR_WARNING : null)
				)
			;
		}

		$clientBlockOptions = Client::BLOCK_WITH_FORMATTED_VALUE | Client::BLOCK_WITH_FIXED_TITLE;
		$clientBlock = $this->buildClientBlock($clientBlockOptions);
		if (isset($clientBlock))
		{
			$result['client'] = $clientBlock;
		}

		$responsibleUserBlock = $this->buildResponsibleUserBlock();
		if (isset($responsibleUserBlock))
		{
			$result['responsibleUser'] = $responsibleUserBlock;
		}

		$subjectBlock = $this->buildSubjectBlock();
		if (isset($subjectBlock) && $this->isPlanned())
		{
			$result['subject'] = $subjectBlock;
		}

		$callQueueBlock = $this->buildCallQueueBlock();
		if (isset($callQueueBlock) && $this->isMissedCall())
		{
			$result['callQueue'] = $callQueueBlock;
		}

		$recordUrls = array_unique(array_column($this->fetchAudioRecordList(), 'VIEW_URL'));
		if (!empty($recordUrls))
		{
			$callScoringPill = $this->buildCopilotCallScoringPill();
			if (isset($callScoringPill))
			{
				$result['callScoringPill'] = $callScoringPill;
			}

			// show first audio record
			$audio = (new Audio())->setId($this->getAssociatedEntityModel()?->get('ID'))->setSource($recordUrls[0]);
			if (isset($clientBlock))
			{
				$communication = $this->getAssociatedEntityModel()?->get('COMMUNICATION') ?? [];
				$title = (new Client($communication, $clientBlockOptions))->getName();
				if (!empty($title))
				{
					$audio->setTitle($title);
				}

				if (isset($communication['ENTITY_TYPE_ID']) && $communication['ENTITY_TYPE_ID'] === CCrmOwnerType::Contact)
				{
					$photo = Container::getInstance()->getContactBroker()->getById($communication['ENTITY_ID'])['PHOTO'] ?? '';
					if ($photo)
					{
						$photoUrl = CFile::ResizeImageGet($photo, ["width" => 2000, "height" => 2000], BX_RESIZE_IMAGE_PROPORTIONAL,false, false, true);
						$audio->setImageUrl($photoUrl['src']);
					}
				}
			}

			$result['audio'] = $audio;
		}

		$additionalInfoBlock = $this->buildAdditionalInfoBlock();
		if (isset($additionalInfoBlock))
		{
			$result['callInformation'] = $additionalInfoBlock;
		}

		$clientMarkBlock = $this->buildClientMarkBlock();
		if (isset($clientMarkBlock))
		{
			$result['clientMark'] = $clientMarkBlock;
		}

		$description = $this->fetchDescription(
			(string)$this->getAssociatedEntityModel()?->get($this->isScheduled() ? 'DESCRIPTION' : 'DESCRIPTION_RAW')
		);

		if (!empty($description))
		{
			$result['description'] = (new ContentBlock\EditableDescription())
				->setText($description)
				->setEditable(false)
				->setHeight(ContentBlock\EditableDescription::HEIGHT_LONG)
			;
		}

		$comment = (string) ($this->fetchInfo()['COMMENT'] ?? null);
		if (!empty($comment))
		{
			$result['comment'] = (new ContentBlock\EditableDescription())
				->setText($comment)
				->setEditable(false)
				->setHeight(ContentBlock\EditableDescription::HEIGHT_LONG)
			;
		}

		return $result;
	}

	public function getButtons(): array
	{
		$doneButton = (new Button(Loc::getMessage('CRM_TIMELINE_BUTTON_CALL_COMPLETE'), Button::TYPE_PRIMARY))->setAction($this->getCompleteAction());
		$scheduleButton = $this->getScheduleButton('Call:Schedule');
		$aiButton = $this->getAIButton();
		$communication = $this->getAssociatedEntityModel()?->get('COMMUNICATION') ?? [];

		switch ($this->fetchDirection())
		{
			case CCrmActivityDirection::Incoming:
				if ($this->isMissedCall())
				{
					if (!empty($communication))
					{
						$buttons['callButton'] = $this->getCallButton(
							$communication,
							$this->isScheduled() ? Button::TYPE_PRIMARY : Button::TYPE_SECONDARY
						);
					}

					if ($this->isScheduled())
					{
						$buttons['scheduleButton'] = $scheduleButton;
					}

					return $buttons ?? [];
				}

				if ($this->isScheduled())
				{
					return $this->isPlanned()
						? ['doneButton' => $doneButton]
						: [
							'doneButton' => $doneButton,
							'scheduleButton' => $scheduleButton,
							'aiButton' => $this->getAIButton(),
						];
				}

				return empty($communication)
					? [
						'aiButton' => $aiButton,
					]
					: [
						'callButton' => $this->getCallButton($communication, Button::TYPE_SECONDARY),
						'aiButton' => $this->getAIButton(),
					];
			case CCrmActivityDirection::Outgoing:
				return empty($communication)
					? [
						'aiButton' => $aiButton,
					]
					: [
						'callButton' => $this->getCallButton(
							$communication,
							$this->isScheduled() ? Button::TYPE_PRIMARY : Button::TYPE_SECONDARY
						),
						'aiButton' => $aiButton,
					];
		}

		return [];
	}

	public function getAdditionalIconButton(): ?IconButton
	{
		$callInfo = $this->fetchInfo();
		if ($this->isTranscribed($callInfo))
		{
			return (new IconButton('script', Loc::getMessage('CRM_TIMELINE_BUTTON_TIP_TRANSCRIPT')))
				->setScopeWeb()
				->setAction((new JsEvent('Call:OpenTranscript'))
					->addActionParamString('callId', $callInfo['CALL_ID']))
			;
		}

		return null;
	}

	public function getMenuItems(): array
	{
		$items = parent::getMenuItems();

		if ($this->isPlanned())
		{
			if (isset($items['edit']))
			{
				$items['edit']->setScopeWeb();
			}

			if (isset($items['view']))
			{
				$items['view']->setScopeWeb();
			}
		}
		else
		{
			unset($items['edit'], $items['view']);
		}

		$records = $this->fetchAudioRecordList();
		$isSingleRecord = (count($records) === 1);
		if (!empty($records))
		{
			foreach ($records as $index => $record)
			{
				$menuItemName = $isSingleRecord ? null : $record['NAME'];
				$items["downloadFile_$index"] = MenuItemFactory::createDownloadFileMenuItem($menuItemName)
					->setAction(
						(new JsEvent('Call:DownloadRecord'))
							->addActionParamString('url', $record['VIEW_URL'])
					)
				;
			}
		}

		return $items;
	}

	public function getTags(): ?array
	{
		$tags = [];

		if ($this->isMissedCall())
		{
			$tags['missedCall'] = new Tag(
				Loc::getMessage('CRM_TIMELINE_TAG_CALL_MISSED'),
				Tag::TYPE_FAILURE
			);
		}

		$callInfo = $this->fetchInfo();
		if ($this->isTranscribed($callInfo) && $callInfo['TRANSCRIPT_PENDING'])
		{
			$tags['transcriptPending'] = new Tag(
				Loc::getMessage('CRM_TIMELINE_TAG_TRANSCRIPT_PENDING'),
				Tag::TYPE_WARNING
			);
		}

		return array_merge($tags, $this->getAiTags());
	}

	/**
	 * @return Tag[]
	 */
	private function getAiTags(): array
	{
		$tags = [];
		$entityTypeId = $this->getContext()->getIdentifier()->getEntityTypeId();

		if (
			$this->isCopilotScope()
			&& (new OperationState(
				$this->getActivityId(),
				$entityTypeId,
				$this->getContext()->getIdentifier()->getEntityId(),

			))->isFillFieldsScenarioSuccess()
		)
		{
			$tags['copilotDone'] = new Tag(
				Loc::getMessage('CRM_TIMELINE_TAG_COPILOT_DONE'),
				Tag::TYPE_LAVENDER
			);

			return $tags;
		}

		$limitExceededBadge = Container::getInstance()->getBadge(
			Badge::AI_CALL_FIELDS_FILLING_RESULT,
			AiCallFieldsFillingResult::ERROR_LIMIT_EXCEEDED,
		);

		$itemIdentifier = $this->getContext()->getIdentifier();
		$sourceIdentifier = new SourceIdentifier(
			SourceIdentifier::CRM_OWNER_TYPE_PROVIDER,
			CCrmOwnerType::Activity,
			$this->getActivityId(),
		);

		if ($limitExceededBadge->isBound($itemIdentifier, $sourceIdentifier))
		{
			$tags['copilotLimitExceeded'] = new Tag(
				AiCallFieldsFillingResult::getLimitExceededTextValue(),
				Tag::TYPE_FAILURE,
			);
		}

		return $tags;
	}

	public function needShowNotes(): bool
	{
		return true;
	}

	public function getPayload(): ?Payload
	{
		$aiButton = $this->getAIButton();

		if ($aiButton === null || $aiButton->getState() === Layout\Button::STATE_DISABLED)
		{
			return null;
		}

		$isWelcomeTourEnabled = (CopilotInCall::getInstance())
			->setEntityTypeId($this->getContext()->getIdentifier()->getEntityTypeId())
			->isWelcomeTourEnabled()
		;
		$isWelcomeTourAutomaticallyEnabled = (CopilotRunAutomatically::getInstance())
			->setEntityTypeId($this->getContext()->getIdentifier()->getEntityTypeId())
			->isWelcomeTourEnabled()
		;
		$isWelcomeTourManuallyEnabled = (CopilotRunManually::getInstance())
			->setEntityTypeId($this->getContext()->getIdentifier()->getEntityTypeId())
			->isWelcomeTourEnabled()
		;

		return (new Payload())
			->addValueBoolean(
				'isWelcomeTourEnabled',
				$isWelcomeTourEnabled
			)
			->addValueBoolean(
				'isWelcomeTourAutomaticallyEnabled',
				$isWelcomeTourAutomaticallyEnabled
			)
			->addValueBoolean(
				'isWelcomeTourManuallyEnabled',
				$isWelcomeTourManuallyEnabled
			)
		;
	}

	protected function canMoveTo(): bool
	{
		return $this->isScheduled() && $this->isVoxImplant($this->fetchOriginId());
	}

	protected function getDeleteConfirmationText(): string
	{
		$title = $this->getAssociatedEntityModel()?->get('SUBJECT') ?? '';

		return match ($this->fetchDirection())
		{
			CCrmActivityDirection::Incoming => Loc::getMessage('CRM_TIMELINE_INCOMING_CALL_DELETION_CONFIRM', ['#TITLE#' => $title]),
			CCrmActivityDirection::Outgoing => Loc::getMessage('CRM_TIMELINE_OUTGOING_CALL_DELETION_CONFIRM', ['#TITLE#' => $title]),
			default => parent::getDeleteConfirmationText(),
		};
	}

	protected function fetchAudioRecordList(): array
	{
		$originId = $this->fetchOriginId();
		if (!$this->isVoxImplant($originId))
		{
			return [];
		}

		if (!empty($this->getAssociatedEntityModel()?->get('MEDIA_FILE_INFO')['URL']))
		{
			return [[
				'VIEW_URL' => (string)$this->getAssociatedEntityModel()?->get('MEDIA_FILE_INFO')['URL']
			]];
		}

		return parent::fetchAudioRecordList();
	}

	private function buildResponsibleUserBlock(): ?ContentBlock
	{
		$data = $this->getUserData($this->getAssociatedEntityModel()?->get('RESPONSIBLE_ID'));
		if (empty($data))
		{
			return null;
		}

		$url = isset($data['SHOW_URL']) ? new Uri($data['SHOW_URL']) : null;
		$textOrLink = ContentBlockFactory::createTextOrLink($data['FORMATTED_NAME'], $url ? new Redirect($url) : null);

		return (new ContentBlockWithTitle())
			->setTitle(Loc::getMessage("CRM_TIMELINE_BLOCK_TITLE_RESPONSIBLE_USER"))
			->setContentBlock($textOrLink->setIsBold(true))
			->setInline()
		;
	}

	private function buildSubjectBlock(): ?ContentBlock
	{
		$subject = $this->getAssociatedEntityModel()?->get('SUBJECT');
		if (empty($subject))
		{
			return null;
		}

		return (new ContentBlockWithTitle())
			->setTitle(Loc::getMessage("CRM_TIMELINE_BLOCK_TITLE_THEME"))
			->setContentBlock(ContentBlockFactory::createTitle((string)$subject))
			->setInline()
		;
	}

	private function buildCallQueueBlock(): ?ContentBlock
	{
		// TODO: call queue not implemented yet
		/*return (new ContentBlockWithTitle())
			->setTitle(ContentBlockFactory::createTitle(Loc::getMessage('CRM_TIMELINE_BLOCK_TITLE_QUEUE')))
			->setContentBlock((new Text())->setValue('not implemented yet')) // TODO: fix after improving in voximplant module
		;*/

		return null;
	}

	private function buildAdditionalInfoBlock(): ?ContentBlock
	{
		$callInfo = $this->fetchInfo();
		if (empty($callInfo))
		{
			return null;
		}

		$callInfoBlockIsEmpty = true;
		$block = new LineOfTextBlocks();

		// 1st element - phone number
		$portalNumber = $callInfo['PORTAL_LINE']['FULL_NAME'] ?? $callInfo['PORTAL_NUMBER'];
		$formattedValue = PhoneNumber\Parser::getInstance()?->parse($portalNumber)->format();
		if (!empty($formattedValue))
		{
			$block
				->addContentBlock(
					'info1',
					ContentBlockFactory::createTitle(
						Loc::getMessage(
							$this->fetchDirection() === CCrmActivityDirection::Incoming
								? 'CRM_TIMELINE_BLOCK_CALL_ADDITIONAL_INFO_1'
								: 'CRM_TIMELINE_BLOCK_CALL_ADDITIONAL_INFO_1_OUT'
						)
					)->setColor(Text::COLOR_BASE_50)

				)
				->addContentBlock('phoneNumber', ContentBlockFactory::createTitle($formattedValue))
			;

			$callInfoBlockIsEmpty = false;
		}

		// 2nd element - call duration
		$duration = (int)$callInfo['DURATION'];
		if ($duration > 0)
		{
			if (!$callInfoBlockIsEmpty)
			{
				// add delimiter before first block
				$block
					->addContentBlock(
						'delimiter',
						ContentBlockFactory::createTitle(
							html_entity_decode(self::BLOCK_DELIMITER)
						)->setColor(Text::COLOR_BASE_50)
					)
				;
			}

			$block
				->addContentBlock(
					'info2',
					ContentBlockFactory::createTitle(
						Loc::getMessage('CRM_TIMELINE_BLOCK_CALL_ADDITIONAL_INFO_2')
					)->setColor(Text::COLOR_BASE_50)
				)
				->addContentBlock(
					'duration',
					ContentBlockFactory::createTitle(
						Duration::format($duration)
					)->setColor(Text::COLOR_BASE_50)
				)
			;

			$callInfoBlockIsEmpty = false;
		}

		return $callInfoBlockIsEmpty ? null : $block;
	}

	private function buildClientMarkBlock(): ?ContentBlock
	{
		$clientMark = $this->mapClientMark((int)$this->getAssociatedEntityModel()?->get('RESULT_MARK'));
		if (!isset($clientMark))
		{
			return null;
		}

		$callInfo = $this->fetchInfo();

		return (new ClientMark())
			->setMark($clientMark)
			->setText(
				Loc::getMessage(
					'CRM_TIMELINE_BLOCK_CLIENT_MARK_TEXT_MSGVER_1',
					['#MARK#' => (int)($callInfo['CALL_VOTE'] ?? 0)]
				)
			)
		;
	}

	private function buildCopilotCallScoringPill(): ?ContentBlock
	{
		$isPillVisible = AIManager::isAiCallProcessingEnabled()
			&& $this->hasUpdatePermission()
			&& $this->isCopilotScope()
			&& $this->isCopilotMultiScenarioEnabled()
			&& count($this->fetchAudioRecordList()) > 0
		;

		if (!$isPillVisible)
		{
			return null;
		}

		$activityId = $this->getActivityId();
		$ownerTypeId = $this->getContext()->getEntityTypeId();
		$ownerId = $this->getContext()->getEntityId();
		$communication = $this->getAssociatedEntityModel()?->get('COMMUNICATION') ?? [];
		$userData = $this->getUserData($this->getAssociatedEntityModel()?->get('RESPONSIBLE_ID'));
		$scoringResult = AiQualityAssessmentController::getInstance()->getByActivityIdAndJobId($this->getActivityId());
		$jobId = $scoringResult['JOB_ID'] ?? null;
		$createdTimestamp = (new DateTime($this->getAssociatedEntityModel()?->get('CREATED')))->getTimestamp();

		$action = (new JsEvent('Call:OpenCallScoringResult'))
			->addActionParamInt('activityId', $activityId)
			->addActionParamInt('ownerTypeId', $ownerTypeId)
			->addActionParamInt('ownerId', $ownerId)
			->addActionParamInt('activityCreated', $createdTimestamp)
			->addActionParamString('clientDetailUrl', isset($communication['SHOW_URL']) ? new Uri($communication['SHOW_URL']) : null)
			->addActionParamString('clientFullName', $communication['TITLE'] ?? '')
			->addActionParamString('userPhotoUrl', $userData['PHOTO_URL'] ?? '')
			->addActionParamInt('jobId', $jobId)
		;
		$pill = (new CallScoringPill())
			->setAction($action)
			->setScopeWeb()
		;

		if ($scoringResult)
		{
			$pill
				->setTitle($scoringResult['TITLE'] ?? '')
				->setValue(($scoringResult['ASSESSMENT'] ?? 0) . '%')
				->setState(CallScoringPill::STATE_PROCESSED)
			;
		}
		else
		{
			$callAssessmentItem = ItemFactory::getByActivityId($activityId);
			$operationState = new OperationState($activityId, $ownerTypeId, $ownerId);
			$pill
				->setTitle($callAssessmentItem?->getTitle() ?? Loc::getMessage('CRM_TIMELINE_COPILOT_SCORING_PILL_DEFAULT_TITLE'))
				->setState($operationState->isCallScoringScenarioPending()
					? CallScoringPill::STATE_LOADING
					: CallScoringPill::STATE_UNPROCESSED
				)
			;
			$action->addActionParamInt('assessmentSettingsId', $callAssessmentItem?->getId());
		}

		return (new ContentBlockWithTitle())
			->setTitle(Loc::getMessage('CRM_TIMELINE_BLOCK_TITLE_SCRIPT'))
			->setContentBlock($pill)
			->setInline()
		;
	}

	private function getCallButton(array $communication, string $type): ?Button
	{
		if (empty($communication))
		{
			return null;
		}

		$button = new Button(Loc::getMessage('CRM_TIMELINE_BUTTON_CALL'), $type);
		$makeCallAction = function (string $phone) use ($communication) {
			return (new JsEvent('Call:MakeCall'))
				->addActionParamInt('activityId', $this->getActivityId())
				->addActionParamInt('entityTypeId', (int)$communication['ENTITY_TYPE_ID'])
				->addActionParamInt('entityId', (int)$communication['ENTITY_ID'])
				->addActionParamInt('ownerTypeId', $this->getContext()->getEntityTypeId())
				->addActionParamInt('ownerId', $this->getContext()->getEntityId())
				->addActionParamString('phone', $phone)
				->addActionParamString('formattedName', $communication['TITLE'])
				->addActionParamBoolean('showName', $communication['SHOW_NAME'])
			;
		};
		$phoneList = $this->fetchPhoneList($communication['ENTITY_TYPE_ID'], $communication['ENTITY_ID']);
		if (count($phoneList) > 1)
		{
			$phoneMenu = new Menu();
			foreach ($phoneList as $item)
			{
				$title = empty($item['COMPLEX_NAME'])
					? sprintf('%s', $item['VALUE_FORMATTED'])
					: sprintf('%s: %s', $item['COMPLEX_NAME'], $item['VALUE_FORMATTED']);

				$phoneMenu->addItem(
					sprintf('phone_menu_%d_%d', $this->getActivityId(), $item['ID']),
					(new Menu\MenuItem($title))->setAction($makeCallAction((string)$item['VALUE']))
				);
			}

			$button->setAction(new ShowMenu($phoneMenu));
		}
		else
		{
			$button->setAction($makeCallAction((string)$communication['VALUE']));
		}

		return $button;
	}

	private function getAIButton(): ?Activity\Call\CopilotButton
	{
		$activityId = $this->getActivityId();

		// don't show the button
		//	- if call processing with AI not enabled
		//	- OR if user has no update rights
		//	- OR if the entity type is not supported
		//	- OR if there are no audio recordings
		//	- OR if the entity is closed
		//	- OR if there is another entity that is selected as target for this call
		$isButtonVisible = AIManager::isAiCallProcessingEnabled()
			&& $this->hasUpdatePermission()
			&& $this->isCopilotScope()
			&& count($this->fetchAudioRecordList()) > 0
			&& $this->isItemHashValid($activityId, $this->getContext())
		;

		if (!$isButtonVisible)
		{
			return null;
		}

		return new Activity\Call\CopilotButton(
			$this->getContext(),
			$this->getAssociatedEntityModel(),
			$activityId,
			$this->isCopilotMultiScenarioEnabled()
		);
	}

	private function mapClientMark(int $callVote): ?string
	{
		return match ($callVote)
		{
			StatisticsMark::Negative => ClientMark::NEGATIVE,
			StatisticsMark::Neutral => ClientMark::NEUTRAL,
			StatisticsMark::Positive => ClientMark::POSITIVE,
			default => null,
		};
	}

	private function fetchInfo(): array
	{
		$result = $this->getAssociatedEntityModel()?->get('CALL_INFO') ?? [];
		if (!empty($result))
		{
			return $result;
		}

		$originId = $this->fetchOriginId();

		return $this->isVoxImplant($originId)
			? VoxImplantManager::getCallInfo(mb_substr($originId, 3)) ?? []
			: [];
	}

	private function fetchPhoneList(int $entityTypeId, int $entityId): array
	{
		$result = [];

		$dbResult = CCrmFieldMulti::GetList(['ID' => 'asc'], [
			'ENTITY_ID' => CCrmOwnerType::ResolveName($entityTypeId),
			'ELEMENT_ID' => $entityId,
			'TYPE_ID' => 'PHONE'
		]);
		while ($fields = $dbResult->Fetch())
		{
			$value = $fields['VALUE'] ?? '';
			if (empty($value))
			{
				continue;
			}

			$result[] = [
				'ID' => $fields['ID'],
				'VALUE' => $value,
				'VALUE_TYPE' => $fields['VALUE_TYPE'],
				'VALUE_FORMATTED' => PhoneNumber\Parser::getInstance()?->parse($value)->format(),
				'COMPLEX_ID' => $fields['COMPLEX_ID'],
				'COMPLEX_NAME' => CCrmFieldMulti::GetEntityNameByComplex($fields['COMPLEX_ID'], false)
			];
		}

		return $result;
	}

	private function fetchDescription(string $input): string
	{
		if (empty($input))
		{
			return '';
		}

		$settings = $this->getAssociatedEntityModel()?->get('SETTINGS');
		if (isset($settings['IS_DESCRIPTION_ONLY']) && $settings['IS_DESCRIPTION_ONLY']) // new description format
		{
			return trim($input);
		}

		$parts = explode("\n", $input);
		if (str_starts_with($parts[0], Loc::getMessage('CRM_TIMELINE_BLOCK_DESCRIPTION_EXCLUDE_1')))
		{
			return '';
		}

		if (str_starts_with($parts[0], Loc::getMessage('CRM_TIMELINE_BLOCK_DESCRIPTION_EXCLUDE_2')))
		{
			return '';
		}

		return $input;
	}

	private function fetchDirection(): int
	{
		return (int)$this->getAssociatedEntityModel()?->get('DIRECTION');
	}

	private function fetchOriginId(): string
	{
		return (string)$this->getAssociatedEntityModel()?->get('ORIGIN_ID');
	}

	private function isMissedCall(): bool
	{
		$settings = $this->getAssociatedEntityModel()?->get('SETTINGS');

		return isset($settings['MISSED_CALL']) && $settings['MISSED_CALL'];
	}

	private function isVoxImplant(?string $originId): bool
	{
		return isset($originId) && VoxImplantManager::isVoxImplantOriginId($originId);
	}

	private function isTranscribed(array $input): bool
	{
		return isset($input['HAS_TRANSCRIPT']) && $input['HAS_TRANSCRIPT'];
	}

	private function isCopilotMultiScenarioEnabled(): bool
	{
		return ($this->getDate()?->getTimestamp() ?? 0) > (int)Option::get('crm', 'b_crm_copilot_in_cal_grading_ts', 0);
	}

	private function isCopilotScope(): bool
	{
		return in_array(
			$this->getContext()->getEntityTypeId(),
			AIManager::SUPPORTED_ENTITY_TYPE_IDS,
			true
		);
	}
}

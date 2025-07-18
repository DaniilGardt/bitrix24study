<?php

namespace Bitrix\Call\Integration\AI\Outcome;

use Bitrix\Call\Integration;
use Bitrix\Call\Integration\AI\MentionService;
use Bitrix\Call\Integration\AI\Task\TranscriptionOverview;

/*
{
	"topic": "string or null",
	"agenda": {
		"is_mentioned": "bool",
		"explanation": "string or null",
		"quote": "string or null"
	},
	"meeting_details": {
		"type": "string or null",
		"is_exception_meeting": "bool",
		"explanation": "string or null"
	},
	"detailed_takeaways": "long string or null",
	"agreements": [
		{
			"agreement": "string or null",
			"quote": "string or null"
		}
	],
	"action_items": [
		{
			"action_item": "string or null",
			"quote": "string or null"
		}
	],
	"meetings": [
		{
			"meeting": "string or null",
			"quote": "string or null"
		}
	],
	"efficiency":
	{
		"agenda_clearly_stated": {
			"value": "bool",
			"explanation": "string or null"
		},
		"agenda_items_covered": {
			"value": "bool",
			"explanation": "string or null"
		},
		"conclusions_and_actions_outlined": {
			"value": "bool",
			"explanation": "string or null"
		},
		"time_exceed_penalty": {
			"value": "bool",
			"explanation": "string or null"
		}
	}
}
*/

class Overview
{
	public string $topic = '';
	public ?\stdClass $agenda = null;
	public ?\stdClass $efficiency = null;
	public int $efficiencyValue = -1;
	public ?\stdClass $calendar = null;/** @see TranscriptionOverview::buildOutcome */
	public array $tasks = [];
	public array $actionItems = [];
	public array $meetings = [];
	public array $agreements = [];
	public ?\stdClass $meetingDetails = null;
	public bool $isExceptionMeeting = false;
	public string $detailedTakeaways = '';
	public bool $isEmpty = true;


	public function __construct(?Integration\AI\Outcome $outcome = null)
	{
		if ($outcome)
		{
			$convertObj = static function ($input) use (&$convertObj)
			{
				$output = new \stdClass();
				foreach ($input as $key => $val)
				{
					if (is_array($val) && !empty($val))
					{
						$val = $convertObj($val);
					}
					if (!is_null($val))
					{
						$key = lcfirst(str_replace('_', '', ucwords($key, '_')));
						$output->{$key} = $val;
					}
				}
				return $output;
			};

			$fieldsMap = [
				'topic' => 'topic',
				'detailedTakeaways' => 'detailed_takeaways',
			];
			foreach ($fieldsMap as $field => $prop)
			{
				$value = $outcome->getProperty($prop);
				if ($value)
				{
					$this->{$field} = $value->getContent();
				}
			}

			$fieldsMap = [
				'agenda' => 'agenda',
				'meetingDetails' => 'meeting_details',
				'efficiency' => 'efficiency',
				'calendar' => 'calendar',
			];
			foreach ($fieldsMap as $field => $prop)
			{
				$value = $outcome->getProperty($prop)?->getStructure();
				if (is_array($value))
				{
					$this->{$field} = $convertObj($value);
				}
			}

			$fieldsMap = [
				'tasks' => 'tasks',
				'actionItems' => 'action_items',
				'meetings' => 'meetings',
				'agreements' => 'agreements',
			];
			foreach ($fieldsMap as $field => $prop)
			{
				$values = $outcome->getProperty($prop)?->getStructure();
				if (is_array($values))
				{
					$this->{$field} = [];
					foreach ($values as $row)
					{
						$obj = $convertObj($row);
						if (!empty($obj))
						{
							$this->{$field}[] = $obj;
						}
					}
				}
			}
		}

		if ($this->meetingDetails)
		{
			$this->isExceptionMeeting = (bool)($this->meetingDetails?->isExceptionMeeting);
		}

		$this->calcEfficiency();
	}


	public function toRestFormat(): array
	{
		$mentionService = MentionService::getInstance();

		$result = [];

		if ($this?->detailedTakeaways)
		{
			$result['detailedTakeaways'] = $mentionService->replaceBBMentions($this->detailedTakeaways);
		}
		if ($this?->topic)
		{
			$result['topic'] = $mentionService->replaceBBMentions($this->topic);
		}
		if ($this?->agenda)
		{
			$result['agenda'] = [];
			if ($this->agenda?->explanation)
			{
				$result['agenda']['explanation'] = $mentionService->replaceBbMentions($this->agenda->explanation);
			}
			if ($this->agenda?->quote)
			{
				$result['agenda']['quote'] = $mentionService->replaceBbMentions($this->agenda->quote);
			}
		}
		if ($this?->meetingDetails)
		{
			$result['meetingDetails'] = [
				'type' => $this->meetingDetails->type,
			];
		}
		if ($this?->efficiency)
		{
			$result['efficiency'] = [
				'type' => $this->meetingDetails->type,
				'agendaClearlyStated' => (bool)$this->efficiency?->agendaClearlyStated?->value,
				'agendaItemsCovered' => (bool)$this->efficiency?->agendaItemsCovered?->value,
				'conclusionsAndActionsOutlined' => (bool)$this->efficiency?->conclusionsAndActionsOutlined?->value,
			];
		}
		if ($this->efficiencyValue)
		{
			$result['efficiencyValue'] = $this->efficiencyValue;
		}
		if ($this?->calendar)
		{
			$result['calendar'] = [
				'overhead' => $this->calendar->overhead,
			];
		}

		if ($this?->agreements)
		{
			$result['agreements'] = [];
			foreach ($this->agreements as $i => $row)
			{
				if ($row?->agreement)
				{
					$result['agreements'][$i] = [
						'agreement' => $mentionService->replaceBbMentions($row->agreement)
					];
					if ($row?->quote)
					{
						$result['agreements'][$i]['quote'] = $mentionService->replaceBbMentions($row->quote);
					}
				}
			}
		}
		if ($this?->meetings)
		{
			$result['meetings'] = [];
			foreach ($this->meetings as $i => $row)
			{
				if ($row?->meeting)
				{
					$meeting = $row->meeting;
					$result['meetings'][$i] = [
						'meeting' => $mentionService->replaceBbMentions($meeting),
						'meetingMentionLess' => $mentionService->removeBbMentions($meeting),
					];
					if ($row?->quote)
					{
						$result['meetings'][$i]['quote'] = $mentionService->replaceBbMentions($row->quote);
					}
				}
			}
		}
		if ($this?->actionItems)
		{
			$result['actionItems'] = [];
			foreach ($this->actionItems as $i => $row)
			{
				if ($row?->actionItem)
				{
					$actionItem = $row->actionItem;
					$result['actionItems'][$i] = [
						'actionItem' => $mentionService->replaceBbMentions($actionItem),
						'actionItemMentionLess' => $mentionService->removeBbMentions($actionItem)
					];
					if ($row?->quote)
					{
						$result['actionItems'][$i]['quote'] = $mentionService->replaceBbMentions($row->quote);
					}
				}
			}
		}
		if ($this?->tasks)
		{
			$result['tasks'] = [];
			foreach ($this->tasks as  $i => $row)
			{
				if ($row?->task)
				{
					$task = $row->task;
					$result['tasks'][$i] = [
						'task' => $mentionService->replaceBbMentions($task),
						'taskMentionLess' => $mentionService->removeBbMentions($task),
					];
					if ($row?->quote)
					{
						$result['tasks'][$i]['quote'] = $mentionService->replaceBbMentions($row->quote);
					}
				}
			}
		}

		$result['isExceptionMeeting'] = $this->isExceptionMeeting;

		return $result;
	}

	public function calcEfficiency(): int
	{
		if (!empty($this->efficiency))
		{
			$this->efficiencyValue = 0;

			$isPersist = function ($field): bool
			{
				if (!empty($this->efficiency->{$field}))
				{
					if (
						isset($this->efficiency->{$field}->value)
						&& (bool)$this->efficiency->{$field}->value
					)
					{
						return true;
					}
					elseif (
						is_bool($this->efficiency->{$field})
						&& $this->efficiency->{$field}
					)
					{
						return true;
					}
				}
				return false;
			};

			if ($this->isExceptionMeeting)
			{
				$this->efficiencyValue += 25; // #1
				$this->efficiencyValue += 25; // #3
				if ($isPersist('agendaItemsCovered'))
				{
					$this->efficiencyValue += 25;
				}
			}
			else
			{
				$efficiencyWeights = [
					'agendaClearlyStated' => 25, // #1
					'agendaItemsCovered' => 25, // #2
					'conclusionsAndActionsOutlined' => 25,// #3
				];
				foreach ($efficiencyWeights as $field => $weight)
				{
					if ($isPersist($field))
					{
						$this->efficiencyValue += $weight;
					}
				}
			}

			// #4
			if ($this->calendar)
			{
				$this->efficiencyValue += $this->calendar->overhead ? 0 : 25;
			}
			else
			{
				$this->efficiencyValue += 25;
			}

			return $this->efficiencyValue;
		}

		return -1;
	}
}
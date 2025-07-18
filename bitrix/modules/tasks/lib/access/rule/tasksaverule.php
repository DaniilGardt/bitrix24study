<?php
/**
 * Bitrix Framework
 * @package bitrix
 * @subpackage tasks
 * @copyright 2001-2021 Bitrix
 */

namespace Bitrix\Tasks\Access\Rule;

use Bitrix\Main\Access\Rule\AbstractRule;
use Bitrix\Main\Error;
use Bitrix\Main\Localization\Loc;
use Bitrix\Tasks\Access\ActionDictionary;
use Bitrix\Tasks\Access\Model\TaskModel;
use Bitrix\Main\Access\AccessibleItem;
use Bitrix\Tasks\Access\Role\RoleDictionary;
use Bitrix\Tasks\Access\Rule\Traits\AssignTrait;
use Bitrix\Tasks\Access\Rule\Traits\FlowTrait;
use Bitrix\Tasks\Access\Rule\Traits\GroupTrait;
use Bitrix\Tasks\Access\TaskAccessController;

/**
 * @property TaskAccessController $controller
 */
class TaskSaveRule extends AbstractRule
{
	use FlowTrait;
	use AssignTrait;
	use GroupTrait;

	/* @var TaskModel $oldTask */
	private $oldTask;
	/* @var TaskModel $newTask */
	private $newTask;

	public function execute(AccessibleItem $task = null, $params = null): bool
	{
		if (!$task)
		{
			$this->controller->addError(static::class, 'Incorrect task');

			return false;
		}

		if (!$this->checkParams($params))
		{
			$this->controller->addError(static::class, 'Incorrect params');

			return false;
		}

		$this->oldTask = $task;
		$this->newTask = $params;

		// the task should be in the group and tasks enabled on this group
		if (
			$this->newTask->getGroup()
			&& !$this->newTask->getGroup()['TASKS_ENABLED']
		)
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_GROUP_DENIED')));
			$this->controller->addError(static::class, 'Tasks are disabled in group');

			return false;
		}

		// user is admin
		if ($this->user->isAdmin())
		{
			return true;
		}

		// user can update task
		if (!$this->canUpdateTask())
		{
			$this->controller->addError(static::class, 'Access to create or update task denied');

			return false;
		}

		if ($this->newTask->getFlowId() > 0 && $this->checkFlowPermissions($this->newTask->getFlowId()))
		{
			return true;
		}
		elseif (
			$this->newTask->getFlowId() > 0
			&& $this->oldTask->getFlowId() !== $this->newTask->getFlowId()
			&& !$this->checkFlowPermissions($this->newTask->getFlowId())
		)
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_FLOW_DENIED')));
			$this->controller->addError(static::class, 'Access to flow is denied');

			return false;
		}

		// user can set group
		if (
			$this->newTask->getGroupId()
			&& $this->newTask->getGroupId() !== $this->oldTask->getGroupId()
			&& !$this->canSetGroup($this->user->getUserId(), $this->newTask->getGroupId())
		)
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_GROUP_DENIED')));
			$this->controller->addError(static::class, 'Access to set group denied');

			return false;
		}

		// user can assign task to this man
		if (!$this->canAssignTask($this->oldTask, RoleDictionary::ROLE_RESPONSIBLE, $this->newTask))
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_RESPONSIBLE_DENIED')));
			$this->controller->addError(static::class, 'Access to assign responsible denied');

			return false;
		}

		// user can assign task to co-executors
		if (!$this->canAssignTask($this->oldTask, RoleDictionary::ROLE_ACCOMPLICE, $this->newTask))
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_ACCOMPLICE_DENIED')));
			$this->controller->addError(static::class, 'Access to assign accomplice denied');

			return false;
		}

		// user can assign task to auditors
		if (!$this->canAssignAuditors())
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_AUDITOR_DENIED')));

			return false;
		}

		// user can change director (if director has been changed)
		if (
			$this->changedDirector()
			&& !in_array($this->user->getUserId(), $this->newTask->getMembers(RoleDictionary::ROLE_RESPONSIBLE))
			&& !$this->controller->check(ActionDictionary::ACTION_TASK_CHANGE_DIRECTOR, $task, $params)
		)
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_DIRECTOR_DENIED')));
			$this->controller->addError(static::class, 'Access to assign director denied');

			return false;
		}

		if (!$this->checkParentTask($this->newTask))
		{
			$this->controller->addUserError(new Error(Loc::getMessage('TASKS_TASK_SAVE_RULE_PARENT_TASK_DENIED')));
			$this->controller->addError(static::class, 'Access to add parent denied');

			return false;
		}

		return true;
	}

	private function changedDirector()
	{
		$directors = $this->newTask->getMembers(RoleDictionary::ROLE_DIRECTOR);
		if (empty($directors))
		{
			return false;
		}

		if ($directors[0] === $this->user->getUserId())
		{
			return false;
		}

		$responsibles = $this->newTask->getMembers(RoleDictionary::ROLE_RESPONSIBLE);

		// new task
		if (
			!$this->oldTask->getId()
			&& count($responsibles) === 1
			&& $responsibles[0] === $this->user->getUserId()
		)
		{
			return false;
		}

		// director hasn't changed
		if (
			$this->oldTask->getId()
			&& !empty($this->oldTask->getMembers(RoleDictionary::ROLE_DIRECTOR))
			&& $directors[0] === $this->oldTask->getMembers(RoleDictionary::ROLE_DIRECTOR)[0]
		)
		{
			return false;
		}

		return true;
	}

	private function canUpdateTask()
	{
		// can create new task
		if (
			$this->isNew()
		)
		{
			return $this->controller->check(ActionDictionary::ACTION_TASK_CREATE, $this->newTask);
		}

		return $this->controller->check(ActionDictionary::ACTION_TASK_EDIT, $this->oldTask);
	}

	private function checkParams($params = null): bool
	{
		return is_object($params) && $params instanceof TaskModel;
	}

	private function isNew(): bool
	{
		return !$this->oldTask->getId();
	}

	private function canAssignAuditors(): bool
	{
		if ($this->isNew())
		{
			$auditors = $this->newTask->getMembers(RoleDictionary::ROLE_AUDITOR);

			return $this->controller->check(ActionDictionary::ACTION_TASK_ADD_AUDITORS, $this->newTask, $auditors);
		}

		$auditors = array_diff(
			$this->newTask->getMembers(RoleDictionary::ROLE_AUDITOR),
			$this->oldTask->getMembers(RoleDictionary::ROLE_AUDITOR),
		);

		return $this->controller->check(ActionDictionary::ACTION_TASK_ADD_AUDITORS, $this->oldTask, $auditors);
	}

	private function checkParentTask(TaskModel $task): bool
	{
		$parentId = $task->getParentId();
		if ($parentId <= 0)
		{
			return true;
		}

		return $this->controller->checkByItemId(ActionDictionary::ACTION_TASK_READ, $parentId);
	}
}

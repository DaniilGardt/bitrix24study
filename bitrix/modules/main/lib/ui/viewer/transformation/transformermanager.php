<?php

namespace Bitrix\Main\UI\Viewer\Transformation;

use Bitrix\Main\Engine\CurrentUser;
use Bitrix\Main\Error;
use Bitrix\Main\Event;
use Bitrix\Main\EventResult;
use Bitrix\Main\Loader;
use Bitrix\Main\ModuleManager;
use Bitrix\Main\Result;
use Bitrix\Main\SystemException;
use Bitrix\Main\Web\MimeType;

final class TransformerManager
{
	const QUEUE_NAME = 'main_preview';
	const PULL_TAG   = 'mainTransform';

	protected static $transformationList = [];

	public function __construct()
	{
		//optimize
		$this->buildTransformationList();
	}

	public static function getPullTag($fileId)
	{
		return self::PULL_TAG . $fileId;
	}

	private function buildTransformationList()
	{
		if (!empty(static::$transformationList))
		{
			return;
		}

		$default = [
			Document::class,
			Video::class,
		];

		$event = new Event('main', 'onTransformationBuildList');
		$event->send();

		$additionalList = [];
		foreach ($event->getResults() as $result)
		{
			if ($result->getType() != EventResult::SUCCESS)
			{
				continue;
			}
			$result = $result->getParameters();
			if (!is_array($result))
			{
				throw new SystemException('Wrong event result. Must be array.');
			}

			foreach ($result as $class)
			{
				if (!is_string($class) || !class_exists($class))
				{
					throw new SystemException('Wrong event result. There is not a class.');
				}

				if (!is_subclass_of($class, Transformation::class, true))
				{
					throw new SystemException("Wrong event result. {$class} is not a subclass of " . Transformation::class);
				}

				$additionalList[] = $class;
			}
		}

		static::$transformationList = array_merge($default, $additionalList);
	}

	public function isAvailable()
	{
		return ModuleManager::isModuleInstalled('transformer');
	}

	public function transform($fileId)
	{
		$result = new Result();
		if (!Loader::includeModule('transformer'))
		{
			$result->addError(new Error('Could not include module transformer'));

			return $result;
		}

		$fileData = \CFile::getByID($fileId)->fetch();
		if (!$fileData)
		{
			$result->addError(new Error('Could not find file'));

			return $result;
		}

		$transformation = $this->buildTransformationByFile($fileData);
		if (!$transformation)
		{
			$result->addError(new Error('There is no transformation for file'));

			return $result;
		}

		if(
			$transformation->getInputMaxSize() > 0 &&
			$fileData['FILE_SIZE'] > $transformation->getInputMaxSize()
		)
		{
			$result->addError(new Error('Too big file for transformation'));

			return $result;
		}

		$transformer = $transformation->buildTransformer();
		if (!$transformer)
		{
			$result->addError(new Error('Could not build transformer'));

			return $result;
		}

		if (!$this->shouldSendToTransformation($fileData))
		{
			return $result;
		}

		$result = $transformer->transform(
			(int)$fileId,
			[$transformation->getOutputExtension()],
			'main',
			CallbackHandler::class,
			['id' => (int)$fileId, 'fileId' => (int)$fileId, 'queue' => self::QUEUE_NAME]
		);

		if ($result->isSuccess())
		{
			$pullTag = $this->subscribeCurrentUserForTransformation($fileId);
			$result->setData([
				'pullTag' => $pullTag,
			]);
		}

		return $result;
	}

	protected function shouldSendToTransformation(array $fileData): bool
	{
		$id = (int)($fileData['ID'] ?? 0);
		if ($id <= 0)
		{
			return true;
		}

		return !CallbackHandler::existSavedFile($id);
	}

	public function subscribeCurrentUserForTransformation($fileId)
	{
		if (!Loader::includeModule('pull'))
		{
			return null;
		}

		$pullTag = self::getPullTag($fileId);
		\CPullWatch::add(CurrentUser::get()->getId(), $pullTag);

		return $pullTag;
	}

	/**
	 * @param array $fileData
	 *
	 * @return null|Transformation
	 * @throws \ReflectionException
	 */
	public function buildTransformationByFile(array $fileData)
	{
		if (empty($fileData['CONTENT_TYPE']))
		{
			return null;
		}

		$transformation = $this->buildTransformationByContentType($fileData['CONTENT_TYPE']);
		if ($transformation)
		{
			return $transformation;
		}

		if (empty($fileData['ORIGINAL_NAME']))
		{
			return null;
		}

		$mimeType = MimeType::getByFilename($fileData['ORIGINAL_NAME']);

		return $this->buildTransformationByContentType($mimeType);
	}

	/**
	 * @param $contentType
	 *
	 * @return Transformation|null
	 * @throws \ReflectionException
	 */
	private function buildTransformationByContentType($contentType)
	{
		foreach (static::$transformationList as $transformationClass)
		{
			/** @var Transformation $transformationClass */
			if (in_array($contentType, $transformationClass::getInputContentTypes(), true))
			{
				$reflectionClass = new \ReflectionClass($transformationClass);

				return $reflectionClass->newInstance();
			}
		}

		return null;
	}
}

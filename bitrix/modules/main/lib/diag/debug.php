<?php

namespace Bitrix\Main\Diag;

class Debug
{
	/** @var StopWatch[]  */
	protected static $timers = [];
	protected static $timeLabels = [];

	public static function startTimeLabel($name)
	{
		if (!isset(static::$timers[$name]))
		{
			static::$timers[$name] = new StopWatch();
		}
		static::$timers[$name]->start();
	}

	public static function endTimeLabel($name)
	{
		static::$timeLabels[$name]['time'] = (static::$timers[$name] ?? null)?->stop();
	}

	public static function getTimeLabels()
	{
		return static::$timeLabels;
	}

	public static function dump($var, $varName = "", $return = false)
	{
		if ($return)
		{
			ob_start();
		}

		$flComplex = (is_array($var) || is_object($var));

		if ($varName != "")
		{
			echo $varName;

			if ($flComplex)
			{
				echo ":" . ($return ? "\n" : "<br />");
			}
			else
			{
				echo "=";
			}
		}

		if ($flComplex && !$return)
		{
			echo "<pre>";
		}

		var_dump($var);

		if ($flComplex && !$return)
		{
			echo "</pre>";
		}
		echo ($return ? "\n" : "<br />");

		if ($return)
		{
			return ob_get_clean();
		}

		return null;
	}

	public static function dumpToFile($var, $varName = "", $fileName = "")
	{
		if (empty($fileName))
		{
			$fileName = "__bx_log.log";
		}

		$data = self::dump($var, $varName, true);

		file_put_contents($_SERVER["DOCUMENT_ROOT"] . "/" . $fileName, $data . "\n", FILE_APPEND);
	}

	public static function writeToFile($var, $varName = "", $fileName = "")
	{
		if (empty($fileName))
		{
			$fileName = "__bx_log.log";
		}

		$data = "";
		if ($varName != "")
		{
			$data .= $varName . ":\n";
		}

		if (is_array($var))
		{
			$data .= print_r($var, true) . "\n";
		}
		else
		{
			$data .= $var . "\n";
		}

		file_put_contents($_SERVER["DOCUMENT_ROOT"] . "/" . $fileName, $data . "\n", FILE_APPEND);
	}
}

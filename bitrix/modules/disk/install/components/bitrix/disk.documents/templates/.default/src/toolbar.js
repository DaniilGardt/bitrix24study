import {BaseEvent, EventEmitter} from "main.core.events";
import CommonGrid from "./grid/common-grid";
import {Options as GridOptions} from "./options";
import {Reflection} from "main.core";

export default class Toolbar
{
	constructor()
	{

	}

	static reloadGridAndFocus(rowId: ?number)
	{
		const commonGrid = GridOptions.getCommonGrid();
		commonGrid.reload();
	}

	static runCreating(documentType, service): void
	{
		if (BX.message('disk_restriction'))
		{
			//this.blockFeatures();
			return;
		}

		if (service === 'l' && BX.Disk.Document.Local.Instance.isEnabled())
		{
			BX.Disk.Document.Local.Instance.createFile({
				type: documentType,
			}).then((response) => {
				this.reloadGridAndFocus(response.object.id);
			});

			return;
		}

		const createProcess = new BX.Disk.Document.CreateProcess({
			typeFile: documentType,
			serviceCode: service,
			onAfterSave: (response) => {
				if (response.status === 'success')
				{
					this.reloadGridAndFocus(response.object.id);
				}
			}
		});

		createProcess.start();
	}

	static resolveServiceCode(service)
	{
		if (!service)
		{
			service = BX.Disk.getDocumentService();
		}

		if (service)
		{
			return service;
		}

		if (BX.Disk.isAvailableOnlyOffice())
		{
			return 'onlyoffice';
		}

		BX.Disk.InformationPopups.openWindowForSelectDocumentService({});

		return null;
	}

	static createBoard(analyticsElement = null)
	{
		const newTab = window.open('', '_blank');
		const config = {};
		if (analyticsElement)
		{
			config.analytics = {
				event: 'create',
				tool: 'boards',
				category: 'boards',
				c_element: analyticsElement,
			};
		}
		BX.ajax.runAction('disk.integration.flipchart.createDocument', config)
			.then(response => {
				if (response.status === 'success' && response.data.file)
				{
					const manager = BX.Main.gridManager || BX.Main.tileGridManager;
					const grid = manager.getById('diskDocumentsGrid')?.instance;
					if (grid)
					{
						grid.reload();
					}

					if (response.data.viewUrl)
					{
						newTab.location.href = response.data.viewUrl;
					}
				}
			});
	}

	static createDocx(service)
	{
		const code = this.resolveServiceCode(service);
		if (code)
		{
			this.runCreating('docx', code);
		}
	}

	static createXlsx(service)
	{
		const code = this.resolveServiceCode(service);
		if (code)
		{
			this.runCreating('xlsx', code);
		}
	}

	static createPptx(service)
	{
		const code = this.resolveServiceCode(service);
		if (code)
		{
			this.runCreating('pptx', code);
		}
	}

	static createByDefault(service)
	{
		console.log('createByDefault: ', service);
		console.log('try to upload just for the test');
	}
}
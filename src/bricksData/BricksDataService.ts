/*
 * https://github.com/ccagml/leetcode-extension/src/service/BricksDataService.ts
 * Path: https://github.com/ccagml/leetcode-extension
 * Created Date: Tuesday, November 22nd 2022, 10:42:49 am
 * Author: ccagml
 *
 * Copyright (c) 2022  ccagml . All rights reserved.
 */

import { TreeDataProvider, EventEmitter, Event, TreeItem, TreeItemCollapsibleState } from "vscode";
import { BricksNormalId, defaultProblem, ISubmitEvent } from "../model/Model";
import { bricksViewController } from "../controller/BricksViewController";
import { BricksNode } from "../model/NodeModel";
import { bricksDao } from "../dao/bricksDao";
import { groupDao } from "../dao/groupDao";
import { BABA, BABAMediator, BABAProxy, BabaStr, BaseCC } from "../BABA";

export class BricksDataService implements TreeDataProvider<BricksNode> {
  private onDidChangeTreeDataEvent: EventEmitter<BricksNode | undefined | null> = new EventEmitter<
    BricksNode | undefined | null
  >();
  // tslint:disable-next-line:member-ordering
  public readonly onDidChangeTreeData: Event<any> = this.onDidChangeTreeDataEvent.event;

  public async refresh(): Promise<void> {
    this.onDidChangeTreeDataEvent.fire(null);
  }

  public fire() {
    this.onDidChangeTreeDataEvent.fire(null);
  }

  public async initialize() {
    await bricksDao.init();
    await groupDao.init();
  }

  // 节点的内容
  public getTreeItem(element: BricksNode): TreeItem | Thenable<TreeItem> {
    if (element.id === "notSignIn") {
      return {
        label: element.name,
        collapsibleState: element.collapsibleState, // 没有子节点
        command: {
          command: "lcpr.signin",
          title: "工头说你不是我们工地的人",
        },
      };
    }
    let contextValue: string;
    if (element.isProblem) {
      contextValue = element.groupTime ? "nodebricksdiy" : "nodebricks";
    } else {
      contextValue = element.id.toLowerCase();
    }

    const result: TreeItem | Thenable<TreeItem> = {
      label: element.isProblem
        ? (element.score > "0" ? "[score:" + element.score + "]" : "") + `ID:${element.id}.${element.name} `
        : element.name,
      tooltip: this.getSubCategoryTooltip(element),
      collapsibleState: element.collapsibleState || TreeItemCollapsibleState.None,
      iconPath: this.parseIconPathFromProblemState(element),
      command: element.isProblem ? element.previewCommand : undefined,
      resourceUri: element.uri,
      contextValue,
    };
    return result;
  }

  // 获取子节点信息
  public async getChildren(element?: BricksNode | undefined): Promise<BricksNode[] | null | undefined> {
    let sbp = BABA.getProxy(BabaStr.StatusBarProxy);
    if (!sbp.getUser()) {
      return [
        new BricksNode(
          Object.assign({}, defaultProblem, {
            id: "notSignIn",
            name: "工头说你不是我们工地的人",
          }),
          false,
          0,
          TreeItemCollapsibleState.None
        ),
      ];
    }
    if (!element) {
      return await bricksViewController.getRootNodes();
    } else {
      switch (element.id) {
        case BricksNormalId.Today:
          return await bricksViewController.getTodayNodes();
          break;
        case BricksNormalId.Have:
          return await bricksViewController.getHaveNodes();
          break;
        case BricksNormalId.DIY:
          return await bricksViewController.getDiyNode(element);
          break;
        default:
          return [];
          break;
      }
    }
  }

  public async checkSubmit(e: ISubmitEvent) {
    if (e.sub_type == "submit" && e.accepted) {
      let qid: string = e.qid.toString();
      bricksDao.addSubmitTimeByQid(qid);
      BABA.sendNotification(BabaStr.BricksData_refresh);
    }
  }

  public async setBricksType(node: BricksNode, type) {
    let qid: string = node.qid.toString();
    bricksDao.setTypeByQid(qid, type);
    BABA.sendNotification(BabaStr.BricksData_refresh);
  }

  private parseIconPathFromProblemState(element: BricksNode): string {
    switch (element.state) {
      default:
        return "";
    }
  }

  private getSubCategoryTooltip(element: BricksNode): string {
    // return '' unless it is a sub-category node
    if (element.id === "ROOT") {
      return "";
    }
    if (element.toolTip) {
      return element.toolTip;
    }
    return "";
  }

  // 创建一个新的分类
  public async newBrickGroup(name) {
    await groupDao.newBrickGroup(name);
  }
  // 删除一个分类
  public async removeBrickGroup(time) {
    await groupDao.removeBrickGroupByTime(time);
  }

  public async getAllGroup() {
    return await groupDao.getAllGroup();
  }
}

export const bricksDataService: BricksDataService = new BricksDataService();

export class BricksDataProxy extends BABAProxy {
  static NAME = BabaStr.BricksDataProxy;
  constructor() {
    super(BricksDataProxy.NAME);
  }

  public async setBricksType(node: BricksNode, type) {
    bricksDataService.setBricksType(node, type);
  }

  // 创建一个新的分类
  public async newBrickGroup(name) {
    await bricksDataService.newBrickGroup(name);
  }
  // 删除一个分类
  public async removeBrickGroup(time) {
    await bricksDataService.removeBrickGroup(time);
  }

  public async getAllGroup() {
    return await bricksDataService.getAllGroup();
  }
}

export class BricksDataMediator extends BABAMediator {
  static NAME = BabaStr.BricksDataMediator;
  constructor() {
    super(BricksDataMediator.NAME);
  }

  listNotificationInterests(): string[] {
    return [
      BabaStr.VSCODE_DISPOST,
      BabaStr.BricksData_refresh,
      BabaStr.InitAll,
      BabaStr.QuestionData_refreshCacheFinish,
      BabaStr.TreeData_searchTodayFinish,
      BabaStr.TreeData_searchUserContestFinish,
      BabaStr.TreeData_searchScoreRangeFinish,
      BabaStr.TreeData_searchContest,
      BabaStr.ConfigChange_hideScore,
      BabaStr.ConfigChange_SortStrategy,
      BabaStr.TreeData_favoriteChange,
      BabaStr.USER_statusChanged,
      BabaStr.statusBar_update_statusFinish,
    ];
  }
  handleNotification(_notification: BaseCC.BaseCC.INotification) {
    switch (_notification.getName()) {
      case BabaStr.VSCODE_DISPOST:
        break;

      case BabaStr.InitAll:
        bricksDataService.initialize();
        break;
      case BabaStr.BricksData_refresh:
      case BabaStr.USER_statusChanged:
      case BabaStr.statusBar_update_statusFinish:
        bricksDataService.refresh();
        break;
      case BabaStr.QuestionData_refreshCacheFinish:
      case BabaStr.TreeData_searchTodayFinish:
      case BabaStr.TreeData_searchUserContestFinish:
      case BabaStr.TreeData_searchScoreRangeFinish:
      case BabaStr.TreeData_searchContest:
      case BabaStr.ConfigChange_hideScore:
      case BabaStr.ConfigChange_SortStrategy:
      case BabaStr.TreeData_favoriteChange:
        bricksDataService.fire();
        break;
      case BabaStr.CommitResult_showFinish:
        bricksDataService.checkSubmit(_notification.getBody());
      default:
        break;
    }
  }
}
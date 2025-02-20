import { PreparedCrossChainUserOp } from "@/types";
import { parseW3PTestTokenValue } from "@/utils/token";

export default function TxDetails({ preparedTxDetails }: { preparedTxDetails: PreparedCrossChainUserOp }) {
  function computeNetAmount(preparedTxDetails: {
    estimatedGasFeesOnTargetChain: bigint;
    totalTransactionAmountOnTargetChain: bigint;
  }) {
    const netAmount = preparedTxDetails.totalTransactionAmountOnTargetChain - preparedTxDetails.estimatedGasFeesOnTargetChain;
    return parseW3PTestTokenValue(netAmount);
  }

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-md">
      <h3 className="text-lg font-bold mb-2">Transaction Details</h3>
      <div className="space-y-2">
        <p>Estimated Gas Fees: {parseW3PTestTokenValue(preparedTxDetails.estimatedGasFeesOnTargetChain)}</p>
        <p>Total Transaction Amount: {parseW3PTestTokenValue(preparedTxDetails.totalTransactionAmountOnTargetChain)}</p>
        {
          preparedTxDetails.sourceTokenPreFunds.length > 1 && (
            <div className="flex flex-col gap-2 p-2 text-xs">
              <p>Source Token 1: <b>{parseW3PTestTokenValue(preparedTxDetails.sourceTokenPreFunds[0].prefund)}</b></p>
              <p>Source Token 2: <b>{parseW3PTestTokenValue(preparedTxDetails.sourceTokenPreFunds[1].prefund)}</b></p>
            </div>
          )
        }
        <p>
          Net Receivable Amount:&nbsp;
          {computeNetAmount(preparedTxDetails)}
        </p>
      </div>
    </div>
  )
}
